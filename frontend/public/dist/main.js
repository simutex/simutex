/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
var mylib;mylib =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./frontend/js/test.js":
/*!*****************************!*\
  !*** ./frontend/js/test.js ***!
  \*****************************/
/***/ ((module) => {

eval("\r\nfunction attemptDelete() {\r\n    console.log('?');\r\n    if ($(\"#delete_project_title\").val().trim().toLowerCase() == \"<%= unescape(ptitle).trim().toLowerCase() %>\") {\r\n        window.location.href = './delete';\r\n    }\r\n}\r\n\r\n\r\n\r\nfunction removeUser(uuid, user, type) {\r\n    $.post('./settings/removeuser', { data: user, type: type }, (data) => {\r\n        if (data == \"M\") {\r\n            $(\"#\" + uuid).remove();\r\n        } else {\r\n            console.log(\"The account could not be removed.\");\r\n        }\r\n    });\r\n}\r\n\r\n\r\n\r\nfunction addUser() {\r\n    var role = $('#addUserRoleSelect').val();\r\n    var username = $('#addUserUsername').val();\r\n    if (role == \"collaborator\" || role == \"viewer\") {\r\n        if (username != \"\") {\r\n            $.post('./settings/adduser', { data: username, type: role }, (data) => {\r\n                if (data == \"M\") {\r\n                    location.reload();\r\n                } else {\r\n                    console.log(\"The account could not be added.\");\r\n                }\r\n            });\r\n        } else {\r\n            alert(\"The username cannot be blank.\");\r\n        }\r\n    } else {\r\n        alert(\"Please select a role.\");\r\n    }\r\n}\r\n\r\nmodule.exports = {\r\n    attemptDelete,\r\n    removeUser,\r\n    addUser\r\n}\n\n//# sourceURL=webpack://mylib/./frontend/js/test.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__("./frontend/js/test.js");
/******/ })()
;