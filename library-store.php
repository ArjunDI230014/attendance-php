<?php
declare(strict_types=1);

require_once __DIR__ . '/workbook-reader.php';


function libraryRespond(int $status, array $body): never
{
    throw new LibraryResponse($status, $body);
}

function libraryName(mixed $value): string
{
    if (!is_string($value)) {
        throw new InvalidArgumentException('Enter a file name.');
    }
    $name = trim($value);
    if ($name === '' || mb_strlen($name) > 180 || preg_match('/[\x00-\x1f\x7f<>:"\/\\\\|?*]/u', $name)) {
        throw new InvalidArgumentException('Use a file name of up to 180 characters without special path characters.');
    }
    if (!preg_match('/\.xlsx$/i', $name)) {
        throw new InvalidArgumentException('The file name must end in .xlsx. Save older .xls files as .xlsx first.');
    }
    return $name;
}

/** Validate generic Excel workbooks; attendance compatibility is checked when opened. */
function libraryInspect(string $path): array
{
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) {
        throw new InvalidArgumentException('This is not a readable .xlsx file. Re-save it in Excel and try again.');
    }
    try {
        if ($zip->numFiles > 10000) {
            throw new InvalidArgumentException('This workbook contains too many parts.');
        }
        $expanded = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $expanded += $stat['size'];
            if ($expanded > 200 * 1024 * 1024 || $stat['size'] > 80 * 1024 * 1024) {
                throw new InvalidArgumentException('The expanded workbook is too large. Use a smaller file.');
            }
        }
        $xml = $zip->getFromName('xl/workbook.xml');
        if ($xml === false || $zip->locateName('[Content_Types].xml') === false) {
            throw new InvalidArgumentException('The file is missing its Excel workbook structure.');
        }
        $document = attendanceXml(attendancePart($zip, 'xl/workbook.xml'));
        $sheets = [];
        foreach ($document->getElementsByTagNameNS('*', 'sheet') as $sheet) {
            $sheets[] = $sheet->getAttribute('name');
        }
        if (!$sheets) {
            throw new InvalidArgumentException('The workbook has no worksheets.');
        }
        return $sheets;
    } finally {
        $zip->close();
    }
}

function librarySave(string $path, array $files): void
{
    $temporary = $path . '.tmp';
    try {
        $encoded = json_encode(array_values($files), JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        if (file_put_contents($temporary, $encoded) !== strlen($encoded) || !rename($temporary, $path)) {
            throw new RuntimeException('Could not save the file library.');
        }
    } finally {
        if (is_file($temporary)) {
            unlink($temporary);
        }
    }
}

final class LibraryResponse extends RuntimeException
{
    public function __construct(public readonly int $status, public readonly array $body) { parent::__construct(); }
}

function libraryOpenSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('sfsn_library');
    $path = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/') . '/';
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'path' => $path]);
    session_start();
}

function libraryToken(): string
{
    libraryOpenSession();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $token = $_SESSION['csrf'];
    session_write_close();
    return $token;
}

function libraryActive(): ?string
{
    libraryOpenSession();
    $id = $_SESSION['active_workbook'] ?? null;
    session_write_close();
    return is_string($id) ? $id : null;
}

function librarySelect(?string $id): void
{
    libraryOpenSession();
    $_SESSION['active_workbook'] = $id;
    session_write_close();
}

function libraryFlash(?string $message = null, bool $error = false): ?array
{
    libraryOpenSession();
    if ($message !== null) {
        $_SESSION['library_flash'] = ['message' => $message, 'error' => $error];
        $flash = null;
    } else {
        $flash = $_SESSION['library_flash'] ?? null;
        unset($_SESSION['library_flash']);
    }
    session_write_close();
    return $flash;
}

function libraryRequest(string $method, string $action, array $values = [], ?array $file = null, string $csrf = ''): array
{
    try {
        libraryExecute($method, $action, $values, $file, $csrf);
    } catch (LibraryResponse $response) {
        return ['status' => $response->status, 'body' => $response->body];
    } catch (InvalidArgumentException $error) {
        return ['status' => 422, 'body' => ['error' => $error->getMessage()]];
    } catch (Throwable $error) {
        error_log('Attendance file library: ' . $error->getMessage());
        return ['status' => 500, 'body' => ['error' => 'The file operation could not be completed. Check that Apache can write to workbook storage and the PHP Excel extensions are enabled.']];
    }
}

function libraryExecute(string $method, string $action, array $values, ?array $file, string $csrf): never
{
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
        libraryRespond(403, ['error' => 'Open the file library from this dashboard.']);
    }
    if (!in_array($method, ['GET', 'POST'], true)) {
        header('Allow: GET, POST');
        libraryRespond(405, ['error' => 'Use GET or POST for this endpoint.']);
    }
    $token = libraryToken();
    if ($method === 'POST' && !hash_equals($token, $csrf)) {
        libraryRespond(403, ['error' => 'Your library session expired. Refresh the page and try again.']);
    }

    $directory = __DIR__ . '/storage';
    // The installer includes this access rule before any workbooks can be saved.
    if (!is_file($directory . '/.htaccess') || trim((string) file_get_contents($directory . '/.htaccess')) !== 'Require all denied') {
        throw new RuntimeException('The private workbook storage folder is not configured. Run the dashboard installer.');
    }
    $lock = fopen($directory . '/library.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Could not lock workbook storage.');
    }
    try {
        $indexPath = $directory . '/library.json';
        $files = is_file($indexPath) ? json_decode((string) file_get_contents($indexPath), true, 512, JSON_THROW_ON_ERROR) : [];
        if (!is_array($files)) {
            throw new RuntimeException('The library index is invalid.');
        }
        if ($method === 'GET' && $action === 'list') {
            libraryRespond(200, ['files' => array_values($files), 'token' => $token]);
        }
        if ($method === 'POST' && $action === 'upload') {
            if (!$file || !is_int($file['error'] ?? null)) {
                libraryRespond(400, ['error' => 'Choose an .xlsx file of up to 30 MB. The upload may exceed the server limit.']);
            }
            if ($file['error'] !== UPLOAD_ERR_OK) {
                libraryRespond(400, ['error' => in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
                    ? 'The file exceeds the server upload limit (maximum 30 MB).'
                    : 'The upload did not complete. Choose the file and try again.']);
            }
            if (!is_uploaded_file($file['tmp_name'])) {
                libraryRespond(400, ['error' => 'The uploaded file is not valid.']);
            }
            if ($file['size'] <= 0 || $file['size'] > 30 * 1024 * 1024) {
                libraryRespond(413, ['error' => 'Upload a non-empty .xlsx file of up to 30 MB.']);
            }
            $name = libraryName($file['name']);
            $sheets = libraryInspect($file['tmp_name']);
            $entry = ['id' => bin2hex(random_bytes(16)), 'name' => $name, 'size' => $file['size'],
                'uploadedAt' => gmdate('c'), 'archivedAt' => null, 'sheets' => $sheets];
            $path = $directory . '/' . $entry['id'] . '.xlsx';
            if (!move_uploaded_file($file['tmp_name'], $path)) {
                throw new RuntimeException('Could not store the uploaded workbook.');
            }
            try {
                $files[] = $entry;
                librarySave($indexPath, $files);
            } catch (Throwable $e) {
                unlink($path);
                throw $e;
            }
            libraryRespond(201, ['file' => $entry]);
        }

        $allowed = $method === 'GET' ? ['download', 'workbook'] : ['archive', 'restore', 'rename', 'delete'];
        if (!in_array($action, $allowed, true)) {
            libraryRespond(400, ['error' => 'Unknown file action.']);
        }
        $id = $values['id'] ?? '';
        if (!is_string($id) || !preg_match('/^[a-f0-9]{32}$/D', $id)) {
            libraryRespond(400, ['error' => 'Invalid file ID.']);
        }
        $position = array_search($id, array_column($files, 'id'), true);
        if ($position === false) {
            libraryRespond(404, ['error' => 'This file is no longer in the library. Refresh the list.']);
        }
        $entry = $files[$position];
        $path = $directory . '/' . $id . '.xlsx';
        if ($action === 'download') {
            if (!is_file($path)) {
                throw new RuntimeException('The stored workbook is missing.');
            }
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header("Content-Disposition: attachment; filename=\"workbook.xlsx\"; filename*=UTF-8''" . rawurlencode($entry['name']));
            header('Content-Length: ' . filesize($path));
            readfile($path);
            exit;
        }
        if ($action === 'workbook') {
            if ($entry['archivedAt'] !== null) {
                libraryRespond(409, ['error' => 'Restore this archived file before loading it into the dashboard.']);
            }
            libraryRespond(200, ['workbook' => readAttendanceWorkbook($path, $entry['name']), 'file' => $entry]);
        }
        if ($action === 'delete') {
            if ($entry['archivedAt'] === null) {
                libraryRespond(409, ['error' => 'Archive the file before permanently deleting it.']);
            }
            // Retain a recoverable copy until the index update succeeds.
            $pending = $path . '.deleting';
            if (!rename($path, $pending)) {
                throw new RuntimeException('Could not remove this workbook.');
            }
            array_splice($files, $position, 1);
            try {
                librarySave($indexPath, $files);
            } catch (Throwable $e) {
                rename($pending, $path);
                throw $e;
            }
            if (!unlink($pending)) {
                // Restore the entry if disk cleanup fails so the user can retry.
                rename($pending, $path);
                array_splice($files, $position, 0, [$entry]);
                librarySave($indexPath, $files);
                throw new RuntimeException('Could not delete the stored file.');
            }
            libraryRespond(200, ['deleted' => $id]);
        }
        if ($action === 'rename') {
            $entry['name'] = libraryName($values['name'] ?? '');
        } elseif ($action === 'archive') {
            $entry['archivedAt'] ??= gmdate('c');
        } elseif ($action === 'restore') {
            $entry['archivedAt'] = null;
        }
        $files[$position] = $entry;
        librarySave($indexPath, $files);
        libraryRespond(200, ['file' => $entry]);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }

}
