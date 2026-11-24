/* Random Tuesday — interactions
   1. Swirling gradient background (WebGL)
   2. Hand-drawn underlines that draw in when they scroll into view
   3. "You might find" list that scrolls upward, 5 at a time
*/
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var paused = reduceMotion;

  /* ---------- 1. Swirling background ---------- */
  // Colours from the original design (first, second, fog)
  var FIRST = [0xd4, 0xad, 0xd8];
  var SECOND = [0xd3, 0xa0, 0x83];
  var FOG = [0xf8, 0xf1, 0xf0];

  var canvas = document.querySelector(".hero__bg");
  var gl = canvas && (canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false }) ||
                      canvas.getContext("experimental-webgl"));
  var drawFrame = null;

  if (gl) {
    var vert = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var frag = [
      "precision mediump float;",
      "uniform vec2 r;uniform float t;uniform vec3 c1;uniform vec3 c2;uniform vec3 cf;",
      "vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}",
      "vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}",
      "vec3 perm(vec3 x){return mod289(((x*34.)+1.)*x);}",
      // 2D simplex noise (Ashima Arts, MIT)
      "float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);",
      "vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);",
      "vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);",
      "vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));",
      "vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;",
      "vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;",
      "m*=1.79284291400159-.85373472095314*(a0*a0+h*h);",
      "vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}",
      "void main(){",
      "  vec2 uv=gl_FragCoord.xy/r;vec2 q=uv;q.x*=r.x/r.y;q*=.46;",
      "  float s=t*.03;",
      // domain warping for the swirling, amorphous look
      "  vec2 w=vec2(snoise(q+vec2(s,-s*.7)),snoise(q+vec2(5.2-s*.8,1.3+s)));",
      "  vec2 w2=vec2(snoise(q+.9*w+vec2(1.7+s*.6,9.2)),snoise(q+.9*w+vec2(8.3,2.8-s*.5)));",
      "  float n=snoise(q+.8*w2)*.5+.5;",
      // edges lean toward the second colour, like the original
      "  vec2 d=uv-.5;float edge=smoothstep(.18,.62,length(d*vec2(1.1,1.25)));",
      "  float mixv=smoothstep(.4,.95,n);mixv=clamp(mixv*.9+edge*.55,0.,1.);",
      "  vec3 col=mix(c1,c2,mixv);",
      "  float f=smoothstep(.55,1.,snoise(q*.8+w*.6+vec2(-s*.4,s*.3))*.5+.5);",
      "  col=mix(col,cf,f*.22);",
      // subtle grain
      "  float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);col+=(g-.5)*.012;",
      "  gl_FragColor=vec4(col,1.);}"
    ].join("\n");

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, vert), fs = sh(gl.FRAGMENT_SHADER, frag);
    var prog = vs && fs && gl.createProgram();
    if (prog) {
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    }
    if (prog && gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var uR = gl.getUniformLocation(prog, "r"), uT = gl.getUniformLocation(prog, "t");
      function c(v) { return v.map(function (x) { return x / 255; }); }
      gl.uniform3fv(gl.getUniformLocation(prog, "c1"), c(FIRST));
      gl.uniform3fv(gl.getUniformLocation(prog, "c2"), c(SECOND));
      gl.uniform3fv(gl.getUniformLocation(prog, "cf"), c(FOG));

      // Render at reduced resolution: it's a soft blur anyway, and it keeps laptops cool.
      var SCALE = 0.25;
      function resize() {
        var w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
        var h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
      }
      var t = 12, last = performance.now(), visible = true;
      drawFrame = function () {
        resize();
        gl.uniform2f(uR, canvas.width, canvas.height);
        gl.uniform1f(uT, t);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      function loop(now) {
        var dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!paused && visible) { t += dt; drawFrame(); }
        requestAnimationFrame(loop);
      }
      // Stop rendering when the hero is off-screen
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
      }
      window.addEventListener("resize", function () { drawFrame(); });
      drawFrame();
      requestAnimationFrame(loop);
    } else {
      canvas.style.display = "none";
    }
  } else if (canvas) {
    canvas.style.display = "none";
  }

  /* ---------- Pause / play button ---------- */
  var toggle = document.querySelector(".motion-toggle");
  function syncToggle() {
    document.documentElement.classList.toggle("is-paused", paused);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
  }
  if (toggle) {
    syncToggle();
    toggle.addEventListener("click", function () { paused = !paused; syncToggle(); });
  }

  /* ---------- 2. Animated underlines ---------- */
  var underlines = document.querySelectorAll(".ul");
  // stagger the headline underlines
  document.querySelectorAll(".headline .ul").forEach(function (el, i) {
    el.style.setProperty("--delay", (0.4 + i * 0.45) + "s");
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-drawn"); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    underlines.forEach(function (el) { io.observe(el); });
  } else {
    underlines.forEach(function (el) { el.classList.add("is-drawn"); });
  }

  /* ---------- 3. "You might find" ticker ---------- */
  // CSS does the scrolling (styles.css, .ticker). Here we just add a second copy
  // of the list so the loop is seamless, and tell CSS how many items one copy has.
  var ticker = document.querySelector(".ticker");
  var list = ticker && ticker.querySelector(".ticker__list");
  if (list && list.children.length) {
    var originals = Array.prototype.slice.call(list.children);
    ticker.style.setProperty("--items", originals.length);
    var rows = 5;
    // one full copy, plus enough extra rows to keep the window filled at the loop point
    for (var k = 0; k < originals.length + rows; k++) {
      var copy = originals[k % originals.length].cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      list.appendChild(copy);
    }
  }
})();
