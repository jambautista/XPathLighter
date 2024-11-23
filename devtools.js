chrome.devtools.panels.elements.createSidebarPane("XPathLighter", function(sidebar) {
  sidebar.setPage("sidebar.html");
  sidebar.onShown.addListener(function(window) {
    console.log("Sidebar shown:", window);
  });
  sidebar.onHidden.addListener(function() {
    console.log("Sidebar hidden");
  });
});
