define([
    'd3',
    'base/component',
    'models/time-model'
], function(d3, Component, TimeModel) {

    //contants
    var class_playing = "vzb-playing",
        class_hide_play = "vzb-ts-hide-play-button";


    var Timeslider = Component.extend({
        init: function(parent, options) {
            this.template = "components/_gapminder/timeslider/timeslider";

            if (!options.model) options.model = new TimeModel();

            // Same constructor as the superclass
            this._super(parent, options);
        },

        postRender: function() {
            var _this = this;

            /* 
             * html elements
             */
            this.range = this.element.select(".vzb-ts-slider");
            this.value = this.element.select('.vzb-ts-slider-value');

            var play = this.element.select(".vzb-ts-btn-play"),
                pause = this.element.select(".vzb-ts-btn-pause");

            /* 
             * model and related events
             */

            this.range.on('input', function() {
                _this._setTime(parseFloat(this.value));
                _this.model.pause();
            });

            //play action
            play.on('click', function() {
                _this.model.play();
            });
            //pause action
            pause.on('click', function() {
                _this.model.pause();
            });

            this.update();
        },


        resize: function() {
            //
        },

        update: function() {
            //time slider should always receive a time model
            var time = this.model.get("value"),
                minValue = this.model.get("start")
            maxValue = this.model.get("end")
            step = this.model.get("step");

            this.range.attr("min", minValue)
                .attr("max", maxValue)
                .attr("step", step);

            this.range[0][0].value = time;

            if (!this.model.get("playable")) {
                this.element.classed(class_hide_play, true);
            } else {
                this.element.classed(class_hide_play, false);
            }

            if (this.model.get("playing")) {
                this.element.classed(class_playing, true);
            } else {
                this.element.classed(class_playing, false);
            }

            time = time.toFixed(0); //without decimals for display
            this.value.html(time);
            this._setTimePosition();
        },

        _setTime: function(time, silent) {
            //update state
            this.model.set("value", time, silent);
            this.update();
        },

        _setTimePosition: function() {
            var rangeW = parseInt(this.range.style('width'),10) - 16,
                timeRange = this.model.get("end") - this.model.get("start"),
                currTime = this.model.get("value") - this.model.get("start"),
                newPosition = Math.round(rangeW * currTime / timeRange) + 10;

            this.value.style("left", newPosition + "px");
        }
    });

    return Timeslider;
});