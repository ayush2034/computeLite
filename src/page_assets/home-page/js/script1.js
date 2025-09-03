// Mobile menu toggle
document.getElementById('mobile-menu-button').addEventListener('click', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

// Model dropdown toggle
document.getElementById('models-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('dashboard-dropdown');
    dropdown.classList.toggle('hidden');
});

// Files dropdown toggle
document.getElementById('files-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('files-dropdown');
    dropdown.classList.toggle('hidden');
});

// RUN dropdown toggle
document.getElementById('run-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('runs-dropdown');
    dropdown.classList.toggle('hidden');
});

// Notebook dropdown toggle
document.getElementById('notebook-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('notebook-dropdown');
    dropdown.classList.toggle('hidden');
});

// Mobile Dashboard dropdown toggle
document.getElementById('mobile-dashboard-button').addEventListener('click', function() {
    const dropdown = document.getElementById('mobile-dashboard-dropdown');
    dropdown.classList.toggle('hidden');
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const dashboardButton = document.getElementById('models-menu-button');
    const dashboardDropdown = document.getElementById('dashboard-dropdown');
    const filesButton = document.getElementById('files-menu-button');
    const filesDropdown = document.getElementById('files-dropdown');
    const runsButton = document.getElementById('run-menu-button');
    const runsDropdown = document.getElementById('runs-dropdown');
    const notebookButton = document.getElementById('notebook-menu-button');
    const notebookDropdown = document.getElementById('notebook-dropdown');
    const mobileDashboardButton = document.getElementById('mobile-dashboard-button');
    const mobileDashboardDropdown = document.getElementById('mobile-dashboard-dropdown');

    // Close desktop dropdown if clicked outside
    if (!dashboardButton.contains(event.target) && !dashboardDropdown.contains(event.target)) {
        dashboardDropdown.classList.add('hidden');
    }

    // Close files dropdown if clicked outside
    if (!filesButton.contains(event.target) && !filesDropdown.contains(event.target)) {
        filesDropdown.classList.add('hidden');
    }

    // Close run dropdown if clicked outside
    if (!runsButton.contains(event.target) && !runsDropdown.contains(event.target)) {
        runsDropdown.classList.add('hidden');
    }

    // Close notebook dropdown if clicked outside
    if (!notebookButton.contains(event.target) && !notebookDropdown.contains(event.target)) {
        notebookDropdown.classList.add('hidden');
    }

    // Close mobile dropdown if clicked outside
    if (!mobileDashboardButton.contains(event.target) && !mobileDashboardDropdown.contains(event.target)) {
        mobileDashboardDropdown.classList.add('hidden');
    }
});