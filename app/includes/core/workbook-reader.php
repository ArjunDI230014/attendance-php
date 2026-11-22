<?php
declare(strict_types=1);

/** Read cached Excel values. Attendance calculations remain in model.mjs. */
function readAttendanceWorkbook(string $path, string $source): array
{
    foreach (['ZipArchive', 'DOMDocument', 'XMLReader'] as $extensionClass) {
        if (!class_exists($extensionClass)) {
            throw new RuntimeException('Missing PHP extension for ' . $extensionClass);
        }
    }
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) {
        throw new InvalidArgumentException('This file is not a readable .xlsx workbook. Re-save it in Excel and try again.');
    }
    $previousXmlErrors = libxml_use_internal_errors(true);
    try {
        $expanded = 0;
        if ($zip->numFiles > 10000) {
            throw new InvalidArgumentException('This workbook contains too many parts. Use a smaller master workbook.');
        }
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $expanded += $stat['size'];
            if ($expanded > 200 * 1024 * 1024 || $stat['size'] > 80 * 1024 * 1024) {
                throw new InvalidArgumentException('The expanded workbook is too large. Use a smaller master workbook.');
            }
        }
        $wb = attendanceXml(attendancePart($zip, 'xl/workbook.xml'));
        $rels = attendanceXml(attendancePart($zip, 'xl/_rels/workbook.xml.rels'));
        $targets = [];
        foreach ($rels->getElementsByTagNameNS('*', 'Relationship') as $rel) {
            if ($rel->getAttribute('TargetMode') !== 'External') {
                $targets[$rel->getAttribute('Id')] = $rel->getAttribute('Target');
            }
        }
        $strings = [];
        $shared = $zip->getFromName('xl/sharedStrings.xml');
        if ($shared !== false) {
            $reader = attendanceStream($shared);
            try {
                while ($reader->read()) {
                    if ($reader->nodeType === XMLReader::ELEMENT && $reader->localName === 'si') {
                        $si = attendanceXml($reader->readOuterXml());
                        $strings[] = attendanceText($si, 't');
                    }
                }
                attendanceCheckXmlErrors();
            } finally {
                $reader->close();
            }
        }
        $timeStyles = [];
        if ($zip->locateName('xl/styles.xml') !== false) {
            $styles = attendanceXml(attendancePart($zip, 'xl/styles.xml'));
            $formats = [];
            foreach ($styles->getElementsByTagNameNS('*', 'numFmt') as $format) {
                $formats[(int) $format->getAttribute('numFmtId')] = $format->getAttribute('formatCode');
            }
            foreach ($styles->getElementsByTagNameNS('*', 'cellXfs') as $xfs) {
                $index = 0;
                foreach ($xfs->getElementsByTagNameNS('*', 'xf') as $xf) {
                    $formatId = (int) $xf->getAttribute('numFmtId');
                    $format = preg_replace('/"[^"]*"|\\\\.|\[[^\]]*\]/', '', $formats[$formatId] ?? '');
                    $timeStyles[$index++] = in_array($formatId, [18, 19, 20, 21, 45, 46, 47], true)
                        || (preg_match('/[hs]/i', $format) && !preg_match('/[yd]/i', $format));
                }
            }
        }
        $attendance = null;
        $master = [];
        $date1904 = false;
        foreach ($wb->getElementsByTagNameNS('*', 'workbookPr') as $properties) {
            $date1904 = in_array($properties->getAttribute('date1904'), ['1', 'true'], true);
        }
        foreach ($wb->getElementsByTagNameNS('*', 'sheet') as $sheet) {
            $name = $sheet->getAttribute('name');
            if (preg_match('/pivot|^ref$|IR IH/i', $name)) {
                continue;
            }
            $id = $sheet->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            $id = $id ?: $sheet->getAttribute('r:id');
            if (!isset($targets[$id])) {
                continue;
            }
            $target = attendanceTarget($targets[$id]);
            [$rows, $rowNumbers] = attendanceRows(attendancePart($zip, $target), $strings, $timeStyles);
            $headerIndex = null;
            $masterIndex = null;
            foreach (array_slice($rows, 0, 20) as $i => $row) {
                $keys = array_map(fn($v) => mb_strtolower(trim((string) $v)), $row);
                if ($headerIndex === null && in_array('date', $keys, true) && in_array('name', $keys, true)
                    && count(array_filter($keys, fn($v) => str_contains($v, 'reporting ref')))) {
                    $headerIndex = $i;
                }
                if ($masterIndex === null && in_array('Employee Name', $row, true) && in_array('Joined Date', $row, true)) {
                    $masterIndex = $i;
                }
            }
            if ($headerIndex !== null && ($attendance === null || count($rows) > count($attendance['rows']))) {
                $attendance = [
                    'headers' => $rows[$headerIndex],
                    'rows' => array_slice($rows, $headerIndex + 1),
                    'rowNumbers' => array_slice($rowNumbers, $headerIndex + 1),
                    'sheet' => $name,
                ];
            }
            if ($masterIndex !== null) {
                $headers = $rows[$masterIndex];
                $ni = array_search('Employee Name', $headers, true);
                $ji = array_search('Joined Date', $headers, true);
                $ii = array_search('Dummy ID', $headers, true);
                foreach (array_slice($rows, $masterIndex + 1) as $row) {
                    if (!empty($row[$ni])) {
                        $key = mb_strtolower(preg_replace('/\s+/u', ' ', trim((string) $row[$ni])));
                        $joined = $row[$ji] ?? null;
                        $master[$key] = ['id' => $ii === false ? '' : (string) ($row[$ii] ?? ''),
                            'joined' => $date1904 && is_numeric($joined) ? $joined + 1462 : $joined];
                    }
                }
            }
        }
        if ($attendance === null) {
            throw new InvalidArgumentException('No attendance table found. Expected Date, Name and Reporting Ref columns.');
        }
        if ($date1904) {
            $dateIndex = array_search('date', array_map(fn($v) => mb_strtolower(trim((string) $v)), $attendance['headers']), true);
            foreach ($attendance['rows'] as &$row) {
                if (isset($row[$dateIndex]) && is_numeric($row[$dateIndex])) {
                    $row[$dateIndex] += 1462;
                }
            }
            unset($row);
        }
        return $attendance + ['master' => (object) $master, 'source' => $source];
    } finally {
        $zip->close();
        libxml_clear_errors();
        libxml_use_internal_errors($previousXmlErrors);
    }
}

function attendancePart(ZipArchive $zip, string $path): string
{
    $value = $zip->getFromName($path);
    if ($value === false) {
        throw new InvalidArgumentException('Workbook part missing: ' . $path);
    }
    if (stripos($value, '<!DOCTYPE') !== false || stripos($value, '<!ENTITY') !== false) {
        throw new InvalidArgumentException('This workbook contains unsupported XML declarations. Re-save it in Excel.');
    }
    return $value;
}

function attendanceXml(string $value): DOMDocument
{
    if ($value === '') {
        throw new InvalidArgumentException('A workbook XML part is damaged. Re-save it in Excel and try again.');
    }
    $doc = new DOMDocument();
    $previous = libxml_use_internal_errors(true);
    try {
        if (!$doc->loadXML($value, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new InvalidArgumentException('A workbook XML part is damaged. Re-save it in Excel and try again.');
        }
        return $doc;
    } finally {
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
    }
}

function attendanceStream(string $value): XMLReader
{
    if (stripos($value, '<!DOCTYPE') !== false || stripos($value, '<!ENTITY') !== false) {
        throw new InvalidArgumentException('This workbook contains unsupported XML declarations.');
    }
    $reader = new XMLReader();
    if (!$reader->XML($value, null, LIBXML_NONET | LIBXML_COMPACT)) {
        throw new InvalidArgumentException('The workbook XML could not be read.');
    }
    return $reader;
}

function attendanceCheckXmlErrors(): void
{
    $error = libxml_get_last_error();
    if ($error && $error->level >= LIBXML_ERR_ERROR) {
        throw new InvalidArgumentException('A workbook XML part is damaged. Re-save it in Excel and try again.');
    }
}

function attendanceText(DOMNode $node, string $tag): string
{
    $text = '';
    foreach ($node->getElementsByTagNameNS('*', $tag) as $part) {
        $text .= $part->textContent;
    }
    return $text;
}

function attendanceTarget(string $target): string
{
    $parts = [];
    foreach (explode('/', str_starts_with($target, '/') ? substr($target, 1) : 'xl/' . $target) as $part) {
        if ($part === '..') {
            array_pop($parts);
        } elseif ($part !== '.' && $part !== '') {
            $parts[] = $part;
        }
    }
    return implode('/', $parts);
}

function attendanceRows(string $xml, array $strings, array $timeStyles): array
{
    $reader = attendanceStream($xml);
    $rows = [];
    $numbers = [];
    try {
        while ($reader->read()) {
            if ($reader->nodeType !== XMLReader::ELEMENT || $reader->localName !== 'row') {
                continue;
            }
            if (count($rows) >= 100000) {
                throw new InvalidArgumentException('A worksheet exceeds 100,000 rows. Use a smaller master workbook.');
            }
            $number = (int) $reader->getAttribute('r');
            $doc = attendanceXml($reader->readOuterXml());
            $values = [];
            foreach ($doc->getElementsByTagNameNS('*', 'c') as $cell) {
                if (!preg_match('/^([A-Z]+)[0-9]+$/', $cell->getAttribute('r'), $match)) {
                    continue;
                }
                $column = 0;
                foreach (str_split($match[1]) as $letter) {
                    $column = $column * 26 + ord($letter) - 64;
                }
                if ($column > 16384) {
                    throw new InvalidArgumentException('A worksheet contains an invalid cell reference.');
                }
                $type = $cell->getAttribute('t');
                $v = attendanceText($cell, 'v');
                $value = match ($type) {
                    's' => $strings[(int) $v] ?? '',
                    'inlineStr' => attendanceText($cell, 't'),
                    'e', 'str', 'd' => $v,
                    default => $v === '' ? null : (is_numeric($v) ? 0 + $v : null),
                };
                if (is_numeric($value) && ($timeStyles[(int) $cell->getAttribute('s')] ?? false)) {
                    $seconds = (int) round((float) $value * 86400) % 86400;
                    $value = sprintf('%02d:%02d:%02d', intdiv($seconds, 3600), intdiv($seconds % 3600, 60), $seconds % 60);
                }
                // JSON must contain arrays with nulls in sparse Excel columns.
                while (count($values) < $column) {
                    $values[] = null;
                }
                $values[$column - 1] = $value;
            }
            $rows[] = $values;
            $numbers[] = $number;
        }
        attendanceCheckXmlErrors();
    } finally {
        $reader->close();
    }
    return [$rows, $numbers];
}
