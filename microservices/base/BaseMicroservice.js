const { exec } = require('child_process');
const path = require('path');

class BaseMicroservice {
  constructor(name, handlers) {
    this.name = name;
    this.routes = this._buildRoutes(handlers);
  }

  _buildRoutes(handlers) {
    return Object.entries(handlers).map(([name, handler]) => ({
      path: `/${this.name}/${name}`,
      handler: handler
    }));
  }
}

module.exports = BaseMicroservice;