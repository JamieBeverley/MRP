// // child node
// // bounding box of all below it
// //
// // point,
// //
// // each 'rectangle' is a 6-dimensional polygon (a search space)
//
// // True 'root' is an Rtree with no parent, search space of entire space
//
// Rtree {
// 	var <>data; // maybe? or 'identifier'?
// 	var <>nodeWidth;
// 	var <>entries; // [] of R-trees, 'nodeWith' long;
// 	var <>parent;
// 	var <>boundingBox; // [] of point dimensions of an n-dimensional hypercube
// 	var <>point;
// 	// [[0,0,0],[0,0,1],[0,1,0],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1]]
//
// 	*new{
// 		|data, nodeWidth, children, parent, boundingBox,point|
// 		^super.new.init(data,nodeWidth,children,parent,boundingBox,point);
// 	}
//
// 	init {
// 		|data, nodeWidth, children, parent, boundingBox,point|
// 		this.data = data;
// 		this.nodeWidth = nodeWidth;
// 		this.children = children?[]; // or insert...
// 		this.parent = parent;
// 		this.boundingBox = boundingBox;
// 		this.point = point;
// 	}
//
// 	*insert{
// 		|root,entry|
// 		if(root.isLeaf(),{
// 			...
// 			},{
// 				var bestNodeIndex;
// 				root.entries.size.do{
// 					|i|
// 					if(root.entries[i].withinBoundingBox(entry) ,{bestNodeIndex = i});
// 				};
//
// 				if(bestNodeIndex.notNil,{ //No need to expand
// 					Rtree.insert(root.entries[bestNodeIndex], entry);
// 					},{ //need to expand
// 						var minExpansion = inf;
// 						var minExpansionIndex = 0;
// 						root.entries.size.do{
// 							|i|
// 							var expansionAmt=Rtree.calculateExpansion(root.entries[i],entry);
// 							if(expansionAmt <minExpansion,{
// 								minExpansion = expansionAmt
// 								minExpansionIndex = i;
// 							});
// 						};
// 						Rtree.expandToAccommodate(root.entries[minExpansionIndex],entry);
// 						Rtree.insert(root.entries[minExpansionIndex], entry);
// 				});
// 		});
//
// 	}
//
//
//
// 	withinBoundingBox{
// 		|point|
// 		// minDimensions and maxDimensions will get 2 opposite corners of the
// 		// hyperCube
// 		var minDimensions = this.boundingBox[0].copy;// FUCKUHG.
// 		var maxDimensions = this.boundingBox[0].copy;
// 		var isWithin = true;
// 		if(point.size != minDimensions.size,{"point and bounding box are of different dimensions".throw;});
//
// 		this.boundingBox.size.do{
// 			|i|
// 			this.boundingBox[i].size.do{
// 				|j|
// 				if( this.boundingBox[i][j] < minDimensions[j],{
// 					minDimensions[j]=this.boundingBox[i][j];
// 				});
// 				if( this.boundingBox[i][j] > maxDimensions[j], {
// 					maxDimensions[j] = this.boundingBox[i][j];
// 				});
// 			};
// 		};
// 		point.size.do{
// 			|i|
// 			isWithin = isWithin && (point[i]>= minDimensions[i]) && (point[i]<= maxDimensions[i]);
// 		};
//
// 		^isWithin;
// 	}
//
// 	// @ I think...
// 	isLeaf{
// 		var r = true;
// 		this.entries.do{
// 			|i|
// 			r = r && i.isEmpty
// 		};
// 		^r;
// 	}
//
//
// 	*calculateExpansionAmount{
// 		|node, entry|
//
// 	}
//
// 	*pointToBox{
// 		|point|
// 		^point!point.size;
// 	}
//
// 	*getMinAndMaxDimensions{
// 		|box|
// 		var minDimensions;
// 		var maxDimensions;
// 		box.size.do{
// 			|i|
// 			box[i].size.do{
// 				|j|
// 				if( box[i][j] < minDimensions[j],{
// 					minDimensions[j]=box[i][j];
// 				});
// 				if( box[i][j] > maxDimensions[j], {
// 					maxDimensions[j] = box[i][j];
// 				});
// 			};
// 		};
// 		^[minDimensions,maxDimensions]
// 	}
//
// }
//
//
//
//
//
// //
//
//
//
//
//
//
//
//
//
//
