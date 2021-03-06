/* eslint-disable max-nested-callbacks */

import * as Pluggable from "../../lib/pluggable";


function buildContext (props = {}, override = {}, transform = {}) {
  return Object.assign({}, props, {
    __extensions__: { override, transform }
  });
}


describe("lib/pluggable", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("promise-decorator decorated function", () => {
    it("shares context properties from the invoked context", done => {
      const context = buildContext({ some: "val" });

      Pluggable.promise(function fun () {
        expect(this).to.have.property("some", "val");
        expect(this).not.to.equal(context);
        done();
      }).call(context);
    });

    it("shares context methods for provided dependencies", done => {
      const context = buildContext({});
      const someDependency = () => {};

      Pluggable.promise(function fun () {
        expect(this).to.have.property("someDependency");
        done();
      }, { someDependency }).call(context);
    });

    it("does not pollute invoked context", done => {
      const context = buildContext({ some: "val" });

      Pluggable.promise(function fun () {
        this.some = "other-val";
        return this;
      }).call(context).then(innerContext => {
        expect(innerContext).to.have.property("some", "other-val");
        expect(context).to.have.property("some", "val");
        done();
      });
    });

    describe("with no overrides", () => {
      it("executes the default function", done => {
        const context = buildContext({});
        Pluggable.promise(done).call(context);
      });

      it("passes arguments to default function", done => {
        const context = buildContext({});

        Pluggable.promise(function fun (a, b) {
          expect(a).to.equal(1);
          expect(b).to.equal(2);
          done();
        }).call(context, 1, 2);
      });

      it("resolves to the default function's return value", done => {
        const context = buildContext({});

        Pluggable.promise(function fun () {
          return "Billy Goat";
        }).call(context).then(result => {
          expect(result).to.equal("Billy Goat");
          done();
        });
      });

      it("resolves to the default function's deferred return value", done => {
        const context = buildContext({});

        Pluggable.promise(function fun () {
          return new Promise(resolve => setTimeout(resolve, 0, "Bridge Troll"));
        }).call(context).then(result => {
          expect(result).to.equal("Bridge Troll");
          done();
        });
      });
    });

    describe("with overrides", () => {
      it("passes arguments to each override and default function", done => {
        const overA = sinon.spy(() => Pluggable.CONTINUE);
        const overB = sinon.spy(() => Pluggable.CONTINUE);
        const funSpy = sinon.spy(() => {});
        function fun () { return funSpy.apply(this, arguments); }

        const context = buildContext({}, { fun: [overA, overB]});

        Pluggable.promise(fun).call(context, "a", "b", "c")
          .then(() => {
            expect(overA)
              .to.have.been.calledOnce.and
              .to.have.been.calledBefore(overB).and
              .to.have.been.calledWith("a", "b", "c");

            expect(overB)
              .to.have.been.calledOnce.and
              .to.have.been.calledBefore(funSpy).and
              .to.have.been.calledWith("a", "b", "c");

            expect(funSpy)
              .to.have.been.calledOnce.and
              .to.have.been.calledWith("a", "b", "c");

            done();
          });
      });

      it("waits until previous override resolves before checking next", done => {
        const overA = sinon.spy(() => Pluggable.CONTINUE);
        const overB = sinon.spy(() => Promise.resolve(Pluggable.CONTINUE));
        const funSpy = sinon.spy(() => {});
        function fun () { return funSpy.apply(this, arguments); }

        const context = buildContext({}, { fun: [overA, overB]});

        Pluggable.promise(fun).call(context, "a", "b", "c")
          .then(() => {
            expect(overA)
              .to.have.been.calledOnce.and
              .to.have.been.calledBefore(overB).and
              .to.have.been.calledWith("a", "b", "c");

            expect(overB)
              .to.have.been.calledOnce.and
              .to.have.been.calledBefore(funSpy).and
              .to.have.been.calledWith("a", "b", "c");

            expect(funSpy)
              .to.have.been.calledOnce.and
              .to.have.been.calledWith("a", "b", "c");

            done();
          });
      });

      it("does not evaluate subsequent overrides if non-CONTINUE is returned", done => {
        const overA = sinon.spy(() => "bob");
        const overB = sinon.spy(() => Pluggable.CONTINUE);
        const funSpy = sinon.spy(() => {});
        function fun () { return funSpy.apply(this, arguments); }

        const context = buildContext({}, { fun: [overA, overB]});

        Pluggable.promise(fun).call(context, "a", "b", "c")
          .then(result => {
            expect(result).to.equal("bob");

            expect(overA)
              .to.have.been.calledOnce.and
              .to.have.been.calledWith("a", "b", "c");

            expect(overB).not.to.have.been.called;
            expect(funSpy).not.to.have.been.called;
            done();
          });
      });

      it("does not evaluate subsequent overrides if non-CONTINUE is resolved", done => {
        const overA = sinon.spy(() => Promise.resolve("bob"));
        const overB = sinon.spy(() => Pluggable.CONTINUE);
        const funSpy = sinon.spy(() => {});
        function fun () { return funSpy.apply(this, arguments); }

        const context = buildContext({}, { fun: [overA, overB]});

        Pluggable.promise(fun).call(context, "a", "b", "c")
          .then(result => {
            expect(result).to.equal("bob");

            expect(overA)
              .to.have.been.calledOnce.and
              .to.have.been.calledWith("a", "b", "c");

            expect(overB).not.to.have.been.called;
            expect(funSpy).not.to.have.been.called;
            done();
          });
      });

    });

    describe("nested", () => {
      it("shares context properties from the parent's invoked context", done => {
        const childSpy = sinon.spy(function () { return this; });
        function _child () { return childSpy.apply(this, arguments); }
        const child = Pluggable.promise(_child);

        function parent () { return this.child(); }

        const context = buildContext({ wall: "street" });

        Pluggable.promise(parent, { child }).call(context)
          .then(childContext => {
            expect(childSpy).to.have.been.calledOnce;
            expect(childContext).to.have.property("wall", "street");
            done();
          });
      });

      it("does not share context methods for parent's provided dependencies", done => {
        const child = Pluggable.promise(function child () {
          return this;
        });
        function parent () { return this.child(); }

        const context = buildContext({});

        Pluggable.promise(parent, { child }).call(context)
          .then(childContext => {
            expect(childContext).not.to.have.property("child");
            done();
          });

      });

      it("shares context methods for child's provided dependencies", done => {
        const grandchild = Pluggable.promise(function grandchild () {});
        const child = Pluggable.promise(function child () { return this; }, { grandchild });
        function parent () { return Promise.all([this, this.child()]); }

        const context = buildContext({});

        Pluggable.promise(parent, { child }).call(context)
          .then(contexts => {
            const [parentContext, childContext] = contexts;
            expect(childContext).to.have.property("grandchild");
            expect(parentContext).not.to.have.property("grandchild");
            done();
          });
      });

      it("does not pollute parent or grandparent context", done => {
        const context = buildContext({ val: "outer" });

        const grandchild = Pluggable.promise(function grandchild () {
          this.val = "grandchild";
          return this;
        });

        const child = Pluggable.promise(function child () {
          this.val = "child";
          return Promise.all([this, this.grandchild()]);
        }, { grandchild });

        function parent () {
          var self = this;
          this.val = "parent";
          return this.child().then(offspringContexts => {
            const [childCxt, grandchildCxt] = offspringContexts;
            return [self, childCxt, grandchildCxt];
          });
        }


        Pluggable.promise(parent, { child }).call(context)
          .then(contexts => {
            const [parentCxt, childCxt, grandchildCxt] = contexts;

            expect(parentCxt).to.have.property("val", "parent");
            expect(childCxt).to.have.property("val", "child");
            expect(grandchildCxt).to.have.property("val", "grandchild");
            done();
          });
      });
    });
  });

  describe("stream", () => {
    it.skip("is implemented");
  });

  describe("sync", () => {
    it.skip("is implemented");
  });
});
