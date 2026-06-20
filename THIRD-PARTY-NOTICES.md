# Third-Party Notices

This project bundles or derives from the following third-party software.
Each component is distributed under its own license, reproduced below.

---

## Tabler Icons

The application icon (`assets/icon.svg` / `assets/icon.ico`) is derived from the
"hourglass" icon in Tabler Icons.

- Project: https://tabler.io/icons
- Source: https://github.com/tabler/tabler-icons

```
MIT License

Copyright (c) 2020-2026 Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Electron (and bundled Chromium, Node.js, V8, ffmpeg)

The packaged application bundles the Electron runtime, which is licensed under
the MIT License and itself bundles Chromium, Node.js, V8, ffmpeg, and other
components under their respective licenses (BSD, MIT, LGPL, and others).

The full notices for these are shipped with every build:

- `LICENSE.electron.txt`
- `LICENSES.chromium.html`

(both produced automatically by electron-builder in the packaged output)

- Project: https://www.electronjs.org
- Source: https://github.com/electron/electron
