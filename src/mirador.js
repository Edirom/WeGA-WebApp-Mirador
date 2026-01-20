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


/**
 * Jump to a specific canvas in a manifest. canvasIndexOrId may be either a numeric
 * index (0-based) or a full canvas id/IRI. This method will grab the manifest to
 * resolve the canvas id from the viewer store when an index is provided.
 * It supports IIIF Presentation v3 (manifest.items[]) and
 * v2 (manifest.sequences[0].canvases[]).
 *
 * This function is tailored to the use in the WeGA WebApp and assumes
 * that the windowId matches the manifestId
 *
 * @param {Mirador.viewer} viewer A Mirador viewer instance
 * @param {string}         manifestId The manifest identifier/IRI
 * @param {string}         canvasIndexOrId Either a numeric index (0-based) or a full canvas id/IRI
 * @return {void}
 */
window.goToCanvas = function (viewer, manifestId, canvasIndexOrId) {
  //console.log("function goToCanvas");
  //console.log(viewer);

  let canvasId = null;
  const maybeIndex = parseInt(canvasIndexOrId, 10),
       windowId = manifestId;

  // Get manifest from Mirador's Redux store
  // to map index number to canvas ID
  const state = viewer.store.getState();
  const manifest = state.manifests[manifestId].json;
  //console.debug(manifest);
  if (!manifest) {
    return console.error('Manifest not available from viewer store')
  }

  //console.log("state:", state);
  // If a number was provided, fetch the manifest and map index -> id
  if (!Number.isNaN(maybeIndex)) {
    const index = maybeIndex;
    try {
      // IIIF Presentation API v3
      if (Array.isArray(manifest.items) && manifest.items[index]) {
        canvasId = manifest.items[index].id || manifest.items[index]['@id'];
      }
      // IIIF Presentation API v2
      else if (manifest.sequences && manifest.sequences[0] && Array.isArray(manifest.sequences[0].canvases) && manifest.sequences[0].canvases[index]) {
        canvasId = manifest.sequences[0].canvases[index].id || manifest.sequences[0].canvases[index]['@id'];
      }

      if (!canvasId) {
        throw new Error(`Canvas at index ${index} not found in manifest ${manifestId}`);
      }
    } catch (err) {
      console.error('Error resolving canvas id from manifest:', err);
      throw err;
    }
  } else {
    // assume it's already a canvas id/IRI
    canvasId = canvasIndexOrId;
  }

  if(canvasId === state.windows?.[windowId]?.canvasId) {
      console.log("No need to update canvas")
  }
  else {
    try {
      // Finally, dispatch Mirador action to set the canvas
      viewer.store.dispatch(Mirador.actions.setCanvas(windowId, canvasId));
      console.log("Canvas changed to canvas ID " + canvasId)
    } catch (err) {
      throw err;
    }
  }
}
