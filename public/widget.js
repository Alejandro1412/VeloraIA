/*!
 * Velora booking widget. Paste on any website:
 * <script src="https://YOUR-DOMAIN/widget.js" data-business="biz_xxx" async></script>
 * Optional: data-label="Agenda tu cita" data-color="#2b4cff"
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var business = script.getAttribute("data-business");
  if (!business) return console.warn("[Velora] Falta data-business en el script del widget.");
  var origin = new URL(script.src).origin;
  var color = script.getAttribute("data-color") || "#2b4cff";
  var label = script.getAttribute("data-label") || "Agenda tu cita";

  var root = document.createElement("div");
  root.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif";

  var frameWrap = document.createElement("div");
  frameWrap.style.cssText =
    "display:none;position:absolute;right:0;bottom:64px;width:min(380px,calc(100vw - 32px));height:min(600px,calc(100vh - 110px));border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(14,27,61,.35);background:#fff";
  var frame = document.createElement("iframe");
  frame.title = "Agenda tu cita";
  frame.style.cssText = "border:0;width:100%;height:100%";
  frame.loading = "lazy";
  frameWrap.appendChild(frame);

  var button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-expanded", "false");
  button.style.cssText =
    "border:0;cursor:pointer;background:" + color + ";color:#fff;font-size:15px;font-weight:600;padding:14px 20px;border-radius:999px;box-shadow:0 12px 30px rgba(14,27,61,.3)";
  button.addEventListener("click", function () {
    var open = frameWrap.style.display !== "none";
    if (!frame.src) frame.src = origin + "/reservar/" + encodeURIComponent(business) + "?embed=1";
    frameWrap.style.display = open ? "none" : "block";
    button.setAttribute("aria-expanded", String(!open));
    button.textContent = open ? label : "Cerrar";
  });

  root.appendChild(frameWrap);
  root.appendChild(button);
  document.body.appendChild(root);
})();
