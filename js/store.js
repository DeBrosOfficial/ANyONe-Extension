document.addEventListener("DOMContentLoaded", () => {
  const comingSoonText = document.getElementById("comingSoon");
  const comingSoonImage = document.getElementById("fullScreenImage");

  // Check if the domain is working
  fetch('https://store.debros.io', { method: 'HEAD', mode: 'no-cors' })
    .then(response => {
      if (response.ok) {
        window.location.href = 'https://store.debros.io';
      } else {
        showComingSoonMessage();
      }
    })
    .catch(() => {
      showComingSoonMessage();
    });

  function showComingSoonMessage() {
    setTimeout(() => {
      comingSoonImage.style.opacity = 1;
    }, 200); 

    setTimeout(() => {
      comingSoonText.style.opacity = 1;
    }, 1000); 
  }
});