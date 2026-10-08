# Verification — 2026-10-05

The final `./cloud-setup.sh` run completed successfully using JDK 21, Gradle 9.8.0, AGP 9.4.1, Kotlin/Compose compiler 2.4.20, KSP 2.3.12, SDK platform 37.2, and build-tools 37.0.0. Dependencies are pinned to the stable releases retrieved from the available official repositories (Compose BOM 2026.09.00, Activity 1.13.0, Lifecycle 2.11.0, Room 2.8.5, DataStore 1.2.1, Play Services Location 21.4.0, Coroutines 1.11.0).

| Check | Result |
|---|---|
| `assembleDebug` | Passed; APK generated |
| `testDebugUnitTest` | 17 executed, 17 passed, 0 failed/errors, 0 skipped |
| `lintDebug` | Passed; report says "No issues found" |
| SQLite active slot | Passed: duplicate singleton rejected |
| SQLite migration 1→2 | Passed: rows preserved, columns/indexes match exported schema |
| Outing deletion | Passed: points/events/active slot cascade, expenses remain unlinked, fuel remains |
| Expense deletion | Passed: dependent fuel record cascades |
| `apksigner verify --verbose` | Passed; APK signature scheme v2, valid for Android 8+ |
| Existing website tracked files | Unchanged |

APK: `app/build/outputs/apk/debug/app-debug.apk` (debug signed, approximately 20 MiB).
SHA-256: `cd2231973e6670fe3690da8d0c0316b8996a03c8ea248898d768ecd3b770945a`.

The schema checks execute the real migration SQL and exported Room table/index definitions on SQLite. They verify constraints and data preservation; they do not substitute for device instrumentation of the Room adapter or Android service lifecycle.

Gradle reports compatibility deprecations for a future Gradle 10 upgrade. The Android Lint report has no errors or warnings. Tool activation uses the cloud machine's maintained Java trust store; TLS/signature/checksum verification was retained.

## Device checks still required

No Android device/emulator was used for the final validation. ADB's default configuration directory is outside this sandbox, and this machine exposes no KVM device. UI interactions, live GPS, Android/OEM background callbacks, reboot recovery, Google Play Services integration, and real battery behavior remain unverified on hardware.

On the intended phone, verify:

1. Arabic RTL and light/dark/system modes, including date/time pickers.
2. Denied, approximate, precise, background, activity, and notification permission paths.
3. Home configuration by GPS and map; a user-defined university circle/polygon.
4. Manual start, route recording, short traffic lights, a multi-hour stop, resumed driving, and manual end.
5. Automatic start with the screen closed; passing near home versus parking for five minutes.
6. University arrival, a brief boundary exit/reentry, and a meaningful departure.
7. Reopening during a journey and recovery following a process/device restart within Android's restrictions.
8. Airplane-mode tracking and route display; imported licensed raster MBTiles coverage and provider attribution.
9. Expenses, full/partial fuel fills, insufficient-data handling, classification, confirmed deletion, and complete data deletion.

An offline Jeddah–Makkah basemap package is not bundled. Import a licensed raster MBTiles package in Settings; route overlays and core tracking do not depend on it. Statistics use outing start-date attribution and separate expense timestamps, as described in the UI and README.
