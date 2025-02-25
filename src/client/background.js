function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 5 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    
    const tx = (Math.random() - 0.5) * 200;
    const ty = (Math.random() - 0.5) * 200;
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    
    const duration = Math.random() * 3 + 2;
    particle.style.animation = `particleAnimation ${duration}s linear infinite`;
    
    return particle;
}

function initParticles() {
    const container = document.getElementById('particles-js');
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = createParticle();
        container.appendChild(particle);
    }
}

window.addEventListener('load', initParticles);