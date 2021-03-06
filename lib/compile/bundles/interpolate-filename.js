import * as Pluggable from "../../pluggable";

function interpolateFilename (bundle) {
  let dest = bundle.dest
    .replace("[setHash]", bundle.setHash)
    .replace("[bundleHash]", bundle.bundleHash);
  if (bundle.module) {
    dest = dest.replace("[primaryModuleHash]", bundle.module.hash);
  }

  return Object.assign({}, bundle, { dest });
}

export default Pluggable.sync(interpolateFilename);
