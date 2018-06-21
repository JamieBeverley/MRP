import Feature from 'ol/feature'

var Random = function(opts){
  Feature.call(this, opts)
}

Random.prototype = Object.create(Feature.prototype,{constructor: Random});

export default Random
