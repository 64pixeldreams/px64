# px64 Test Suite

This folder contains all test files and demos for the px64 library.

## 🧪 Test Files

### **Core Functionality Tests**
- **`test-refactored-binders.html`** - Comprehensive test of all 14+ binders with visual feedback
- **`test-helpers.html`** - Tests for `reactive()` helper and `addBinders()` method
- **`test-text-binder.html`** - Specific test for refactored text binder
- **`test-memory-leaks.html`** - Memory leak testing with automatic cleanup verification

### **Security & Safety**
- **`html-sanitizer-demo.html`** ⭐ **RECOMMENDED** - Working HTML sanitizer demonstration
  - Side-by-side comparison of `html:` vs `html-safe:` binders
  - Interactive buttons to test sanitization
  - Chrome XSS-safe examples that actually work

## 🚀 How to Run Tests

1. **Start a local server** from the project root:
   ```bash
   # Python
   python -m http.server 8000

   # Node.js
   npx http-server -p 8000
   ```

2. **Open tests in browser**:
   - Main test: http://localhost:8000/tests/test-refactored-binders.html
   - Sanitizer demo: http://localhost:8000/tests/html-sanitizer-demo.html
   - Memory test: http://localhost:8000/tests/test-memory-leaks.html

## ✅ Test Results Expected

### **test-refactored-binders.html**
- **14/14 tests should pass** ✅
- All binders working with reactive() helper
- Interactive controls for real-time testing

### **html-sanitizer-demo.html**
- **No syntax errors** ✅
- Demonstrates XSS protection without Chrome blocking
- Shows sanitizer removing dangerous tags

### **test-memory-leaks.html**
- **Dynamic element creation/removal** ✅
- Automatic observer cleanup verification
- Memory usage monitoring

## 🎯 Best Test for Demos

**`html-sanitizer-demo.html`** is the best for demonstrating px64's security features - it loads without errors and shows the sanitizer in action.

## 📝 Notes

- All test files have been updated with correct `../px64.js` paths
- The broken `test-html-sanitizer.html` has been removed
- Tests are organized and ready for continuous integration
