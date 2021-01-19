const bootstrap = require("bootstrap");

// Enable Tooltips
$(() => {
    $('[data-toggle="tooltip"]').tooltip()
});

// Menu Toggle Script
$("#menu-toggle").on('click', (e) => {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});