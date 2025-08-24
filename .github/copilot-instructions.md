# DAWGCHECK Training Simulator

DAWGCHECK Training Simulator is a Progressive Web Application (PWA) built with pure HTML5, CSS, and JavaScript. It simulates an insurance application workflow for training purposes, featuring a multi-step wizard interface, dynamic form validation, local storage autosave, and offline capabilities.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Serve the Application
- **No build process required** - this is a static web application
- Verify Node.js availability: `node --version && npm --version`
- Serve with Node.js: `npx http-server . -p 8080 -c-1` -- starts in 3-5 seconds. NEVER CANCEL.
- Serve with Python: `python3 -m http.server 8080` -- starts immediately. NEVER CANCEL.
- Access application: Open browser to `http://127.0.0.1:8080` or `http://localhost:8080`

### Validation
- **ALWAYS manually validate any changes** by serving the application and testing in browser
- **CRITICAL TESTING SCENARIOS**: After making changes, always test these user workflows:
  1. Load the application and verify it displays the Producer Information step
  2. Fill required fields (First Name, Last Name) and click "Next ▸" to advance to Proposed Insured step
  3. Verify stepper navigation shows completion checkmark for completed steps
  4. Test form validation by trying to advance without filling required fields
  5. Verify autosave functionality by entering data and refreshing the page
- **PWA Testing**: Test service worker registration in Chrome DevTools → Application → Service Workers
- **NO BUILD/LINT/TEST COMMANDS EXIST** - validation is purely functional through browser testing

### Development Guidelines
- **File structure is simple**: All source files are in repository root
- **Make minimal changes**: Edit existing HTML, CSS, or JS files in place
- **No package.json**: This application has no dependencies or build system
- **Browser compatibility**: Modern browsers required for PWA features

## Repository Structure

### Root Directory
```
.
├── README.md              # Project documentation
├── index.html            # Main application entry point (31KB)
├── app.js                # Core application logic (18KB)
├── styles.css            # Application styles (4KB)
├── Nijnu.js              # Additional utilities (11KB)
├── wizard.html           # Alternative wizard interface (3KB)
├── wizard.js             # Wizard logic (1KB)
├── manifest.json         # PWA manifest
├── service-worker.js     # PWA service worker
└── assets/
    ├── icon-192.png      # PWA icon (300KB)
    ├── icon-512.png      # PWA icon (1.5MB)
    └── icons             # Directory marker file
```

### Key Application Files
- **index.html**: Main application with 20-step insurance application wizard
- **app.js**: State management, validation, step navigation, and form logic
- **styles.css**: Responsive CSS with CSS custom properties
- **service-worker.js**: Cache-first PWA service worker
- **manifest.json**: PWA configuration for standalone app experience

## Common Tasks

### Starting Development Server
```bash
# Method 1: Node.js (recommended for development)
cd /path/to/repository
npx http-server . -p 8080 -c-1

# Method 2: Python (simpler, no dependencies)
cd /path/to/repository  
python3 -m http.server 8080

# Expected output:
# Starting up http-server, serving .
# Available on: http://127.0.0.1:8080
```

### Manual Testing Workflow
1. **Start server** (using either method above)
2. **Open browser** to http://127.0.0.1:8080
3. **Test form progression**:
   - Fill "First" field with test data
   - Fill "Last" field with test data
   - Click "Next ▸" button
   - Verify navigation to "Proposed Insured" step
   - Verify checkmark appears on completed "Producer Information" step
4. **Test validation**:
   - Try clicking "Next ▸" without filling required fields
   - Verify error styling appears on empty required fields
5. **Test autosave**: Enter data, refresh page, verify data persists

### Repository Contents (Frequently Referenced)
```bash
# ls -la output
total 108
-rw-r--r-- 1 runner docker  2492 README.md
-rw-r--r-- 1 runner docker 31217 index.html  
-rw-r--r-- 1 runner docker 18444 app.js
-rw-r--r-- 1 runner docker  4512 styles.css
-rw-r--r-- 1 runner docker 10847 Nijnu.js
-rw-r--r-- 1 runner docker  2862 wizard.html
-rw-r--r-- 1 runner docker  1058 wizard.js
-rw-r--r-- 1 runner docker   409 manifest.json
-rw-r--r-- 1 runner docker  1109 service-worker.js
drwxr-xr-x 2 runner docker  4096 assets/
```

### Application State Structure (app.js)
The application manages state through a global `state` object with these key properties:
- `stepOrder`: Array of 20 step identifiers
- `currentIndex`: Active step position (0-19)
- `locked`: HIPAA and application lock status
- `signatures`: Signature workflow status
- `beneficiaries`: Dynamic beneficiary data
- `premium`: Calculated premium amounts

## PWA Features
- **Service Worker**: Caches application files for offline use
- **Manifest**: Configures standalone app installation
- **Icons**: 192px and 512px PWA icons available in assets/
- **Autosave**: Uses localStorage for form persistence
- **Responsive**: Optimized for landscape orientation on tablets

## Debugging Common Issues
- **404 errors for dawgcheck-logo.png**: Expected - referenced but not present in assets/
- **Service worker errors**: Normal during development - refresh to update cache
- **Form not advancing**: Check browser console for validation errors
- **Autosave not working**: Verify localStorage is enabled in browser

## Expected Behavior
- **Startup time**: Immediate (static files)
- **Server startup**: 3-5 seconds (npx http-server) or immediate (Python)
- **Navigation**: Smooth step progression with validation
- **Data persistence**: Form data auto-saves and restores on page refresh
- **Mobile compatibility**: Responsive design with orientation warnings

## Files NOT to Modify
- **assets/icons**: PWA icon files (large binary assets)
- **README.md**: Project documentation (unless specifically updating for code changes)

Always test changes by serving the application and completing at least one full user workflow before considering development complete.