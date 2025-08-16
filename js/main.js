// Main JavaScript for the home page
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scrolling for any internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add loading animation for page cards
    const pageCards = document.querySelectorAll('.page-card');
    pageCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });

    // Add click analytics (optional - for future use)
    pageCards.forEach(card => {
        card.addEventListener('click', function() {
            const pageName = this.querySelector('h3').textContent;
            console.log(`Navigating to: ${pageName}`);
            // You can add analytics tracking here in the future
        });
    });
});
