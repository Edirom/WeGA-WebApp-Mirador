import Mirador from 'mirador/dist/es/src/index';
import { miradorImageToolsPlugin } from 'mirador-image-tools';


window.renderMirador = function (options) {
  return Mirador.viewer({
    ...options
  },
    [
    ...miradorImageToolsPlugin
    ]
  )
}
