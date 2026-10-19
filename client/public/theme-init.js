try {
  var stored = localStorage.getItem('animeverse.theme');
  var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
} catch (error) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
