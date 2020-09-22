const { expect } = require("chai");
const index = require("../src/index");

describe("index", function () {
  describe("provider", function () {
    it("should have properties type, name, version", function () {
      expect(index).to.have.property("type");
      expect(index).to.have.property("name");
      expect(index).to.have.property("version");
    });
  });
});
