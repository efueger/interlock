import { Plugin, transform } from "babel-core";

export default function coerceToCommonJs (origAst) {
  const synchronousRequires = [];

  const getRequires = new Plugin("getRequires", {
    position: "after",
    visitor: {
      CallExpression: function (node/*, parent */) {
        if (node.callee.name === "require") {
          if (node.arguments.length === 0) {
            throw new Error("Require expressions must include a target.");
          }
          synchronousRequires.push(node.arguments[0].value);
        }
      }
    }
  });

  const {ast} = transform.fromAst(origAst, null, {
    whitelist: ["es6.modules"],
    plugins: [{ transformer: getRequires, position: "after" }]
  });

  return {ast, synchronousRequires};
}