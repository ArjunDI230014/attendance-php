# Application behavior

Choose Marketplace or Food on the main page. Each section has Overview, Staff attendance, Excel files and Archive. Excel files contains the upload controls and workbook list together.

A selected workbook stays selected on this computer until another workbook is chosen, the dashboard is cleared, or that workbook is archived/deleted. Marketplace and Food remember selections separately. Uploads save to the library by default; Open in dashboard explicitly changes the selection.

Rename and Delete open dialogs over the list. Validation errors remain in the dialog, and successful changes refresh that same list. Workbooks must be archived before permanent deletion.

The moon/sun button switches themes with a circular reveal. The browser remembers the theme across pages and workspaces. Reduced-motion settings skip the animation.

In-app links, dashboard buttons, form actions and Back/Forward share one navigation controller. It prepares the next view before replacing the current content. Previous page listeners are released, stale responses are cancelled, and a slim progress bar appears only for slower loads. Downloads and in-page anchors retain browser behavior.

Attendance calculations use saved Excel values. Workbooks require Date, Name, Reporting Ref, Actual and the scheduled/actual count columns. Open and save a workbook in Excel if formula results have not been cached. Valid Excel files without attendance tables can be stored in the library and cannot be selected as attendance data.

Staff profiles show counted leave, source reasons, monthly breakdowns and excluded source records. Filters and CSV exports follow the selected scope. Follow-up actions and metric settings stay in the current browser; export action backups to transfer them.

For setup, deployment and recovery, see [HANDOVER.md](HANDOVER.md). For exact code locations, see [FILE-MAP.md](FILE-MAP.md).
