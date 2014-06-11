define([
	'base/model'
], function(Model) {


    var ToolModel = Model.extend({
        init: function(state, data) {
            this.state = new Model(state);
            this.data = new Model(data);

            this._super();
        },

        getState: function(attr) {
            return this.state.get(attr);
        },

        setState: function(attr, value) {
            // TODO: Here we do validation

            this.state.set(attr, value);
            this.events.trigger("change:state");
        },

        getData: function(attr) {
            return this.data.get(attr);
        },

        setData: function(attr, value) {
        	// TODO: Here we do validation
            
            this.data.set(attr, value);
            this.events.trigger("change:data");
        }    	

    });

    return ToolModel;
});