// import * as bootstrap from 'bootstrap'

// Accordion Toggle
document.querySelectorAll('.bc-accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', function () {
        const panel = document.getElementById(this.getAttribute('aria-controls'));
        const expanded = this.getAttribute('aria-expanded') === 'true';

        // Close all
        document.querySelectorAll('.bc-accordion-panel').forEach(p => p.hidden = true);
        document.querySelectorAll('.bc-accordion-trigger').forEach(t => {
            t.setAttribute('aria-expanded', 'false');
            const svg = t.querySelector('span:last-of-type');
            if (svg) svg.style.transform = 'rotate(0deg)';
        });

        const svg = this.querySelector('span:last-of-type');

        if (!expanded) {
            panel.hidden = false;
            this.setAttribute('aria-expanded', 'true');
            if (svg) svg.style.transform = 'rotate(45deg)';
        }
    });
});