import Class from "base/class";
import globals from "base/globals";
import * as utils from "base/utils";

import topojson from "helpers/topojson";
import d3_geo_projection from "helpers/d3.geoProjection";
const GoogleMapsLoader = require("google-maps");

import mapboxgl from "mapbox-gl/dist/mapbox-gl.js";

const MapLayer = Class.extend({
  init(context, parent) {
    this.shapes = null;
    this.mapLands = [];
    this.parent = parent;
    this.context = context;
    this.parent = parent;
    this.paths = {};
    d3_geo_projection();
  },

  initMap() {
    this.mapGraph = this.parent.mapSvg.html("").append("g")
      .attr("class", "vzb-bmc-map-graph");

    const _this = this;
    const shape_path = this.context.model.ui.map.topology.path
        || globals.ext_resources.host + globals.ext_resources.preloadPath + "world-50m.json";

    const projection = "geo" + utils.capitalize(this.context.model.ui.map.projection);

    this.zeroProjection = d3[projection]();
    this.zeroProjection
      .scale(1)
      .translate([0, 0]);

    this.projection = d3[projection]();
    this.projection
      .scale(1)
      .translate([0, 0]);

    this.mapPath = d3.geoPath()
        .projection(this.projection);


    this.context.model.ui.map.scale = 1;
    return this._loadShapes(shape_path).then(
      shapes => {
        _this.shapes = shapes;
        _this.mapFeature = topojson.feature(_this.shapes, _this.shapes.objects[this.context.model.ui.map.topology.objects.geo]);
        _this.mapBounds = _this.mapPath.bounds(_this.mapFeature);

        const boundaries = topojson.mesh(_this.shapes, _this.shapes.objects[_this.context.model.ui.map.topology.objects.boundaries], (a, b) => a !== b);
        if (_this.mapFeature.features) {
          _this.mapLands = _this.mapGraph.selectAll(".land")
            .data(_this.mapFeature.features)
            .enter().insert("path")
            .attr("d", _this.mapPath)
            .attr("class", "land")
            .each(function(d, i) {
              const view = d3.select(this);
              d.key = d.properties[_this.context.model.ui.map.topology.geoIdProperty] ?
                  d.properties[_this.context.model.ui.map.topology.geoIdProperty].toString().toLowerCase() : d.id;
              _this.paths[d.key] = d;
              view
                .attr("id", d.key);
            });
        } else {
          _this.mapGraph.insert("path")
            .datum(_this.mapFeature)
            .attr("class", "land");

        }
        _this.mapGraph.insert("path")
          .datum(boundaries)
          .attr("class", "boundary");
      }
    );
  },

  updateMapColors() {
    const _this = this;
    this.mapLands
      .style("fill", d => _this.parent.getMapColor(d.key));
  },

  _loadShapes(shape_path) {
    return new Promise((resolve, reject) => {
      d3.json(shape_path, (error, json) => {
        if (error) return console.warn("Failed loading json " + shape_path + ". " + error);
        resolve(json);
      });
    });

  },

  rescaleMap(canvas) {
    //var topoCanvas =
    let emitEvent = false;
    const margin = this.context.activeProfile.margin;

    const currentNW = this.zeroProjection([
      this.context.model.ui.map.bounds.west,
      this.context.model.ui.map.bounds.north
    ]);
    const currentSE = this.zeroProjection([
      this.context.model.ui.map.bounds.east,
      this.context.model.ui.map.bounds.south
    ]);
    let scaleDelta = 1, mapTopOffset = 0, mapLeftOffset = 0;

    if (!canvas) {
      emitEvent = true;
      canvas = [
        [0, 0],
        [this.context.width, this.context.height]
      ];
      const scaleX = (canvas[1][0] - canvas[0][0]) / (currentSE[0] - currentNW[0]);
      const scaleY = (canvas[1][1] - canvas[0][1]) / (currentSE[1] - currentNW[1]);
      if (scaleX != scaleY) {
        if (scaleX > scaleY) {
          scaleDelta = scaleY;
          mapLeftOffset = (this.context.width - Math.abs(scaleDelta * (currentNW[1] - currentSE[1]))) / 2;
        } else {
          scaleDelta = scaleX;
          mapTopOffset = (this.context.height - Math.abs(scaleDelta * (currentNW[0] - currentSE[0]))) / 2;
        }
      }
    } else {
      scaleDelta = (canvas[1][0] - canvas[0][0]) / (currentSE[0] - currentNW[0]);
    }
    // translate projection to the middle of map
    this.projection
      .translate([canvas[0][0] - (currentNW[0] * scaleDelta) + mapLeftOffset, canvas[0][1] - (currentNW[1] * scaleDelta) + mapTopOffset])
      .scale(scaleDelta)
      .precision(0.1);

    this.mapGraph
      .selectAll("path").attr("d", this.mapPath);

    // resize and put in center
    this.parent.mapSvg
      .style("transform", "translate(" + margin.left + "px," + margin.top + "px)")
      .attr("width", this.context.width)
      .attr("height", this.context.height);

    // set skew function used for bubbles in chart
    const _this = this;

    // if canvas not received this map is main and shound trigger redraw points on tool
    if (emitEvent) {
      this.parent.boundsChanged();
    }
  },

  centroid(key) {
    if ((key || key == 0) && this.paths[key]) {
      return this.mapPath.centroid(this.paths[key]);
    }
    return null;
  },

  invert(x, y) {
    return this.projection([x || 0, y || 0]);
  }

});

const GoogleMapLayer = Class.extend({

  init(context, parent) {
    this.context = context;
    this.parent = parent;
  },

  initMap(domSelector) {
    const _this = this;
    this.mapCanvas = this.parent.mapRoot;
    this.mapCanvas
      .style("width", "100%")
      .style("height", "100%");

    GoogleMapsLoader.KEY = "AIzaSyAP0vMZwYojifwGYHTnEtYV40v6-MdLGFM";
    return new Promise((resolve, reject) => {
      GoogleMapsLoader.load(google => {
        _this.map = new google.maps.Map(_this.mapCanvas.node(), {
          disableDefaultUI: true,
          backgroundColor: "#FFFFFF",
          mapTypeId: _this.context.model.ui.map.mapLayer
        });

        _this.overlay = new google.maps.OverlayView();
        _this.overlay.draw = function() {};
        _this.overlay.setMap(_this.map);

        google.maps.event.addListener(_this.map, "bounds_changed", () => {
          if (_this.map.getBounds()) {
            _this.parent.boundsChanged();
          }
        });
/*
        const rectangle = new google.maps.Rectangle({
          bounds: {
            north: _this.context.model.ui.map.bounds.north,
            east: _this.context.model.ui.map.bounds.east,
            south: _this.context.model.ui.map.bounds.south,
            west: _this.context.model.ui.map.bounds.west
          },
          editable: true,
          draggable: true
        });
        rectangle.setMap(_this.map);
*/
        resolve();
      });
    });
  },

  updateLayer() {
    if (this.map) {
      this.map.setMapTypeId(this.context.model.ui.map.mapLayer);
    }
  },

  rescaleMap() {

    google.maps.event.trigger(this.map, "resize");

    const rectBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(this.context.model.ui.map.bounds.north, this.context.model.ui.map.bounds.west),
        new google.maps.LatLng(this.context.model.ui.map.bounds.south, this.context.model.ui.map.bounds.east)
    );
    this.map.fitBounds(rectBounds);
  },
  invert(x, y) {
    const projection = this.overlay.getProjection();
    if (!projection) {
      return [0, 0];
    }
    const coords = projection.fromLatLngToContainerPixel(new google.maps.LatLng(y, x));
    return [coords.x, coords.y];
  },

  moveOver(x, y) {
    const scale = Math.pow(2, this.map.getZoom());
    const pointDiff = new google.maps.Point(x / scale, y / scale);
    this.context.model.ui.map.bounds = {
      west: this.context.model.ui.map.bounds.west - pointDiff.x,
      north: this.context.model.ui.map.bounds.north + pointDiff.y,
      east: this.context.model.ui.map.bounds.east - pointDiff.x,
      south: this.context.model.ui.map.bounds.south + pointDiff.y
    };
    this.rescaleMap();
  },

  getZoom() {
    return this.map.getZoom();
  },

  getCanvas() {
    return [
      this.invert(this.context.model.ui.map.bounds.west, this.context.model.ui.map.bounds.north),
      this.invert(this.context.model.ui.map.bounds.east, this.context.model.ui.map.bounds.south)
    ];
  },

  getCenter() {
    const center = this.map.getCenter();
    this.centerMapker.setPosition(center);
    return { lat: center.lat(), lng: center.lng() };
  }
});

const MapboxLayer = Class.extend({

  init(context, parent) {
    mapboxgl.accessToken = "pk.eyJ1Ijoic2VyZ2V5ZiIsImEiOiJjaXlqeWo5YnYwMDBzMzJwZnlwZXJ2bnA2In0.e711ku9KzcFW_x5wmOZTag";
    this.context = context;
    this.parent = parent;
  },

  initMap(domSelector) {
    const _this = this;
    this.mapCanvas = this.parent.mapRoot;
    return new Promise((resolve, reject) => {
      _this.map = new mapboxgl.Map({
        container: _this.mapCanvas.node(),
        interactive: false,
        style: this.context.model.ui.map.mapLayer,
        hash: false
      });
      _this.bounds = [[
        _this.context.model.ui.map.bounds.west,
        _this.context.model.ui.map.bounds.south
      ], [
        _this.context.model.ui.map.bounds.east,
        _this.context.model.ui.map.bounds.north
      ]];
      _this.map.fitBounds(_this.bounds);
      resolve();
    });
  },

  rescaleMap() {
    const _this = this;
    _this.bounds = [[
      _this.context.model.ui.map.bounds.west,
      _this.context.model.ui.map.bounds.south
    ], [
      _this.context.model.ui.map.bounds.east,
      _this.context.model.ui.map.bounds.north
    ]];
    utils.defer(() => {
      _this.map.fitBounds(_this.bounds, { duration: 0 });
      _this.map.resize();
      _this.parent.boundsChanged();
    });
  },

  moveOver(dx, dy) {
    const zeroPoint = this.map.unproject([0, 0]);
    const newPoint = this.map.unproject([dx, dy]);
    this.context.model.ui.map.bounds = {
      west: this.context.model.ui.map.bounds.west + (zeroPoint.lng - newPoint.lng),
      north: this.context.model.ui.map.bounds.north + (zeroPoint.lat - newPoint.lat),
      east: this.context.model.ui.map.bounds.east + (zeroPoint.lng - newPoint.lng),
      south: this.context.model.ui.map.bounds.south + (zeroPoint.lat - newPoint.lat)
    };
    this.rescaleMap();
  },

  updateLayer() {
    if (this.map) {
      this.map.setStyle(this.context.model.ui.map.mapLayer);
    }
  },

  getCanvas() {
    return [
      this.invert(this.context.model.ui.map.bounds.west, this.context.model.ui.map.bounds.north),
      this.invert(this.context.model.ui.map.bounds.east, this.context.model.ui.map.bounds.south)
    ];
  },

  invert(x, y) {
    const coords = this.map.project([x, y]);
    return [coords.x, coords.y];
  }

});

export default Class.extend({
  init(context, domSelector) {
    this.context = context;
    this.domSelector = domSelector;
    this.topojsonMap = null;
    this.keys = {};
    this.mapEngine = this.context.model.ui.map.mapEngine;
    this.mapInstance = null;
    if (this.context.element instanceof d3.selection) {
      this.mapRoot = this.context.element.select(domSelector);
      this.mapSvg = this.context.element.select(".vzb-bmc-map-background");
    } else {
      this.mapRoot = d3.select(this.context.element).select(domSelector);
      this.mapSvg = d3.select(this.context.element).select(".vzb-bmc-map-background");
    }
    this.mapRoot.html("");
    this.mapSvg.html("");
    return this;
  },

  ready() {
    const _this = this;
    this.keys = Object.keys(_this.context.values.hook_centroid)
      .reduce((obj, key) => {
        obj[_this.context.values.hook_centroid[key]] = key;
        return obj;
      }, {});
    this.updateColors();
  },

  getMapColor(key) {
    if (this.keys[key]) {
      return this.context.mcScale(this.context.values.color_map[this.keys[key]]);
    }
    return this.context.COLOR_WHITEISH;
  },

  updateColors() {
    if (this.topojsonMap) {
      this.topojsonMap.updateMapColors();
    }
  },

  getMap() {
    if (!this.mapInstance) {
      switch (this.context.model.ui.map.mapEngine) {
        case "google":
          this.mapInstance = new GoogleMapLayer(this.context, this);
          break;
        case "mapbox":
          this.mapInstance = new MapboxLayer(this.context, this);
          break;
      }
      if (this.mapInstance) {
        this.topojsonMap = new MapLayer(this.context, this);
      } else {
        this.mapInstance = new MapLayer(this.context, this);
      }
      return this;
    }
  },

  moveOver(dx, dy) {
    this.mapInstance.moveOver(dx, dy);
  },

  layerChanged() {
    if (this.mapEngine == this.context.model.ui.map.mapEngine) {
      this.mapInstance.updateLayer();
    } else {
      this.mapEngine = this.context.model.ui.map.mapEngine;
      this.topojsonMap = null;
      this.mapInstance = null;
      this.mapRoot.html("");
      this.mapSvg.html("");
      this.getMap();
      this.initMap().then(
        map => {
          this.rescaleMap();
        });
    }
  },

  initMap() {
    if (!this.topojsonMap) {
      return this.mapInstance.initMap(this.domSelector);
    } else if (!this.mapInstance) {
      return this.topojsonMap.initMap(this.domSelector);
    }
    return Promise.all([
      this.mapInstance.initMap(this.domSelector),
      this.topojsonMap.initMap(this.domSelector)
    ]);
  },

  rescaleMap() {
    if (this.mapInstance) {
      const margin = this.context.activeProfile.margin;
      const _this = this;
      this.mapRoot
        .attr("width", this.context.width + margin.left + margin.right)
        .attr("height", this.context.height + margin.top + margin.bottom)
        .style("position", "absolute")
        .style("left", 0)
        .style("right", 0)
        .style("top", 0)
        .style("bottom", 0);

      this.mapInstance.rescaleMap();
    } else {
      this.topojsonMap.rescaleMap();
    }
  },

  boundsChanged() {
    if (this.topojsonMap) {
      this.topojsonMap.rescaleMap(this.mapInstance.getCanvas());
    }
    this.context.mapBoundsChanged();
  },

  centroid(key) {
    if (this.topojsonMap) {
      return this.topojsonMap.centroid(key);
    }
    return null;
  },

  invert(x, y) {
    if (this.mapInstance) {
      return this.mapInstance.invert(x, y);
    }
    return this.topojsonMap.invert(x, y);
  }

});
