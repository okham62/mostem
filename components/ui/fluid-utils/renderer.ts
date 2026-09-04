import type WebGLFluidEnhanced from "webgl-fluid-enhanced"

export function createRenderer({ canvas }: { canvas: HTMLCanvasElement }) {
  let disposed = false
  let fluid: WebGLFluidEnhanced | null = null

  const ready = import("webgl-fluid-enhanced").then(({ default: Fluid }) => {
    if (disposed) return
    const container = canvas.parentElement
    if (!container) return

    fluid = new Fluid(container)
    container.style.display = "block"
    container.style.position = "relative"
    canvas.style.position = "absolute"
    canvas.style.inset = "0"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.minWidth = "0"
    canvas.style.minHeight = "0"
    canvas.style.display = "block"

    fluid.setConfig({
      simResolution: 128,
      dyeResolution: 1024,
      densityDissipation: 0.7,
      velocityDissipation: 0.2,
      pressure: 0.8,
      pressureIterations: 20,
      curl: 30,
      splatRadius: 0.32,
      splatForce: 7000,
      shading: true,
      colorful: true,
      colorUpdateSpeed: 8,
      colorPalette: ["#6366f1", "#8b5cf6", "#06b6d4", "#3b82f6", "#a855f7"],
      hover: true,
      backgroundColor: "#000000",
      transparent: false,
      brightness: 0.65,
      bloom: true,
      bloomIntensity: 0.75,
      sunrays: true,
      sunraysWeight: 0.7,
    })
    fluid.start()
    fluid.multipleSplats(12)
  })

  return {
    ready,
    dispose() {
      disposed = true
      fluid?.stop()
      fluid = null
    },
  }
}
