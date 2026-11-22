# Directory guide

Use `app/` for current code, `docs/` for instructions, and `scripts/` for common maintenance tasks.

```text
attendance php/
├── app/
│   ├── assets/
│   │   ├── js/
│   │   │   ├── dashboard/     # attendance, charts, profiles and calculations
│   │   │   ├── files/         # uploads and file-action popups
│   │   │   ├── navigation/    # page changes, history and progress
│   │   │   └── theme/         # saved theme and circular reveal
│   │   ├── css/
│   │   │   ├── shared/        # base layout and shared page styles
│   │   │   ├── dashboard/     # staff profile styles
│   │   │   ├── files/         # file library and dialogs
│   │   │   ├── navigation/    # transition and loading styles
│   │   │   └── theme/         # dark palette and theme button
│   │   └── vendor/            # bundled library and license
│   ├── includes/
│   │   ├── core/              # workspaces, storage and workbook parsing
│   │   ├── layout/            # shared header, navigation and theme helpers
│   │   └── pages/             # dashboard, file list and upload controllers
│   ├── views/                 # page templates
│   ├── storage/               # access rule; live data stays in the installed app
│   └── *.php                  # public page/API entry points
├── docs/                      # handover, directory guide and file map
├── scripts/                   # check, install, preview and package
├── tests/
│   ├── unit/
│   ├── integration/
│   └── helpers/
├── releases/                  # versioned handover ZIPs and checksums
├── backups/local/
│   ├── change-history/        # earlier feature-change backups
│   ├── source-snapshots/      # source before reorganizing
│   ├── installer-tests/       # disposable-install test backups
│   └── install-*/             # real installation backups
├── archive/previous-version/  # older project and historical artifacts
├── Open Dashboard.url
├── package.json
└── README.md
```

Find an exact file in [FILE-MAP.md](FILE-MAP.md). Follow [HANDOVER.md](HANDOVER.md) to install, check, package or recover the application.
