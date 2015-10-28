import * as utils from 'base/utils';
import Tool from 'base/tool';

import BarRankChart from './barrankchart-component';
import {
  timeslider
} from 'components/_index';

var BarRankChart = Tool.extend('BarRankChart', {

  //Run when the tool is created
  init: function(config, options) {

    this.name = "barrankchart";

    this.components = [{
        component: BarRankChart, 
        placeholder: '.vzb-tool-viz', 
        model: ["state.time", "state.entities", "state.marker", "state.language", "state.ui"] 
    }, {
        component: timeslider,
        placeholder: '.vzb-tool-timeslider',
        model: ["state.time"]
    }];

    //constructor is the same as any tool
    this._super(config, options);
  }
  
});

export default BarRankChart;