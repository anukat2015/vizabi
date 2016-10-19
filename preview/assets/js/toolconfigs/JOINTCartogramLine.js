var VIZABI_MODEL = { 
  state: {
    time: {
      value: '2011',
      start: '1996',
      end: '2011'
    },
    entities: {
      dim: "geo",
      opacitySelectDim: .3,
      opacityRegular: 1,
      show: {
          "geo": ["*"]
      },
    },
    entities_line: {
      dim: "geo",
      opacitySelectDim: .3,
      opacityRegular: 1,
      show: {
          "geo": ["zaf"]
      },
    },
    marker: {
      space: ["entities", "time"],
      size: {
        use: "constant",
        //which: "sg_population",//systema globalis
        which: "_default",
        scaleType: "ordinal",
        _important: true,
        showArcs: false,
        allow: {
          scales: ["linear", "ordinal"]
        },
        extent: [0, 1]
      },
      color: {
        use: "indicator",
        which: "piped_water_percentage",
        scaleType: "linear",
        _important: true
      },
      label: {
        use: "property",
        which: "name"
        //which: "province.name"
      }
    },
    marker_line: {
      space: ["entities_line", "time"],
      label: {
        use: "property",
        which: "name"
      },
      axis_y: {
        use: "indicator",
        which: "piped_water_percentage",
        scaleType: "linear",
        allow: {
          scales: ["linear", "log"]
        }
      },
      axis_x: {
        use: "indicator",
        which: "time",
        scaleType: "time",
        allow: {
          scales: ["time"]
        }
      },
      color: {
        use: "property",
        which: "world_4region",
        allow: {
          scales: ["ordinal"],
          names: ["!name"]
        }
      }
    }
  }
}