import Mirador from 'mirador';
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
