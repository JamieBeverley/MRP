child node
bounding box of all below it

point,

each 'rectangle' is a 6-dimensional polygon (a search space)

// True 'root' is an Rtree with no parent, search space of entire space

Rtree {
	var <>data; // maybe? or 'identifier'?
	var <>nodeWidth;
	var <>children; // [] of R-trees, 'nodeWith' long;
	var <>parent;
	var <>boundingBox; // [] of point dimensions of an n-dimensional hypercube
	// [[0,0,0],[0,0,1],[0,1,0],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1]]

	*new{
		|data, nodeWidth, children, parent, boundingBox|
		^super.new.init(nodeWidth,children,parent,boundingBox);
	}

	init {
		this.data = data;
		this.nodeWidth = nodeWidth;
		this.children = children // or insert...
		this.parent = parent;
		this.boundingBox = boundingBox;
	}

	withinBoundingBox{
		|point|
		// minDimensions and maxDimensions will get 2 opposite corners of the
		// hyperCube
		var minDimensions = this.boundingBox[0];
		var maxDimensions = this.boundingBox[0];
		var isWithin = true;
		if(point.size != minDimension.size,{"point and bounding box are of different dimensions".throw;});

		this.boundingBox.do{
			|i|
			i.size.do{
				|j|
				if( i[j]< minDimensions[j],{minDimensions[j]=i[j]});
				if( i[j]> maxDimensions[j],{maxDimensions[j]=i[j]});
			};
		};

		point.size.do{
			|i|
			point = point && (point[i]>= minDimensions[i]) && (point[i]<= maxDimensions[i]);
		};
		^point
	}
}





//










