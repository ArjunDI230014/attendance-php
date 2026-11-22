<?php
declare(strict_types=1);

// Synthetic data only. Generate a tiny Excel fixture for API and browser checks.
$destination = $argv[1] ?? sys_get_temp_dir() . '/attendance-library-test.xlsx';
$generic = ($argv[2] ?? '') === 'generic';
$zip = new ZipArchive();
if ($zip->open($destination, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    throw new RuntimeException('Could not create test workbook.');
}
$zip->addFromString('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
$zip->addFromString('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
$zip->addFromString('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets></workbook>');
$zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
$rows = $generic ? [['Item', 'Quantity'], ['Example', 2]] : [
    ['Date', 'Name', 'Reporting Ref', 'Actual', 'Scheduled Work Count', 'Actual Work Count', 'Actual Off Count', 'Actual Planned Count', 'Actual Unplanned Count', 'Designation', 'Reporting Lead', 'Agent Status'],
    ['2026-11-16', 'Demo Agent', 'Present', 'WORK', 1, 1, 0, 0, 0, 'Chat', 'Demo Lead', 'Active'],
    ['2026-11-17', 'Demo Agent', 'Absent', 'MC', 1, 0, 0, 0, 1, 'Chat', 'Demo Lead', 'Active'],
];
$xml = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
foreach ($rows as $i => $row) {
    $number = $i + 1;
    $xml .= '<row r="' . $number . '">';
    foreach ($row as $column => $value) {
        $reference = chr(65 + $column) . $number;
        $xml .= is_int($value) ? '<c r="' . $reference . '"><v>' . $value . '</v></c>'
            : '<c r="' . $reference . '" t="inlineStr"><is><t>' . htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</t></is></c>';
    }
    $xml .= '</row>';
}
$zip->addFromString('xl/worksheets/sheet1.xml', $xml . '</sheetData></worksheet>');
$zip->close();
echo $destination . PHP_EOL;
