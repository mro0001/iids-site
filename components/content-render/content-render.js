/* Content renderer runtime — injects build-generated HTML into page slots. file://-safe.
   Include content-render.generated.js (window.CONTENT) BEFORE this file, then call
   ContentRender.mountAll() to fill every element carrying a data-content="<key>" attribute
   from window.CONTENT[key]. (Or mount(el, key) for one slot.) */
(function () {
  function mount(el, key) {
    var html = (window.CONTENT || {})[key];
    el.innerHTML = html != null ? html : '<p class="cr-missing">[no rendered content for "' + key + '"]</p>';
  }
  function mountAll(root) {
    (root || document).querySelectorAll('[data-content]').forEach(function (el) {
      mount(el, el.getAttribute('data-content'));
    });
  }
  window.ContentRender = { mount: mount, mountAll: mountAll };
})();
