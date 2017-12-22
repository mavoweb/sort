/* global Bliss, Mavo */

(function($, $$) {

var SORT_ATTR = "mv-sort";
var GROUP_ATTR = "mv-groupBy";
var INC_LIST = ["+"];
var DEC_LIST = ["-"];

Mavo.attributes.push(SORT_ATTR);
Mavo.attributes.push(GROUP_ATTR);

Mavo.Plugins.register("sort", {
	hooks: {
		'node-render-end': function(env) {
			if (env.context.nodeType == "Collection") {
				var element = env.context.element;
				if (element) {
					var sortProperties = element.getAttribute(SORT_ATTR);
					if (sortProperties != null) {
						Mavo.Collection.sortDOM(env.context, sortProperties);
					}
				}
			}
		},
		'init-end': function(root) {
			// TODO: Improve performance, will call sort for every element in the
			// collection
			if (root.element) {
				var sortObserver = new Mavo.Observer(root.element, SORT_ATTR, records => {
					for (let record of records) {
						var element = record.target;
						var properties = element.getAttribute(SORT_ATTR);
						if (properties != null) {
							var mavoCollection = Mavo.Collection.get(element);
							Mavo.Collection.sortDOM(mavoCollection, properties);
						}
					}
				}, {subtree: true});

				var groupObserver = new Mavo.Observer(root.element, GROUP_ATTR, records => {
					for (let record of records) {
						var element = record.target;
						var properties = element.getAttribute(GROUP_ATTR);
						if (properties != null) {
							var mavoCollection = Mavo.Collection.get(element);
							Mavo.Collection.groupDOM(mavoCollection, properties);
						}
					}
				}, {subtree: true});
			}
		}
	}
});

/**
 * Sorts an array of primitives or objects. If sorting objects, properties is
 * used to find the values to determine the sorting order
 * @param {Array} array - the array we want to sort
 * @param {...string} [properties] - variable number of properties to use to get
 * values from objects in array to determine sorting order. The first property
 * specified is preferred, and only moves on the next properties in the event of
 * a tie. If none provided, will treat items in array as primitives and attempt
 * to sort in increasing order
 */
Mavo.Functions.sort = function(array, ...properties) {
	var arrayCopy = array.slice();

	if (array.length === 0) {
		return arrayCopy;
	}

	var stableCopy = arrayCopy.map((el, index) => [el, index]);

	stableCopy.sort(function(prevData, nextData) {
		var prev = prevData[0];
		var next = nextData[0];
		if (prev === undefined) {
			return 1;
		}
		if (next === undefined) {
			return -1;
		}
		if (prev === null) {
			return 1;
		}
		if (next === null) {
			return -1;
		}

		var prevNode = null;
		var nextNode = null;

		// If the elements in the array are Mavo nodes, sort by their data
		if (prev instanceof Mavo.Node) {
			prevNode = prev;
			prev = prev.getData();
		}
		if (next instanceof Mavo.Node) {
			nextNode = next;
			next = next.getData();
		}

		// If it's an array of different types, we can't sort properly
		if (typeof prev !== typeof next) {
			return prevData[1]-nextData[1];
		}

		// If there's no properties, attempt to sort primitives in increasing
		// order by default
		if (properties.length === 0) {
			if (prev < next) {
				return -1;
			} else if (prev > next) {
				return 1;
			} else {
				return prevData[1]-nextData[1];
			}
		}

		// Sort objects by first property that doesn't result in a tie
		var isTie = false
		for (let property of properties) {
			isTie = false;
			var inc;
			var new_prev = prev, new_next = next;
			var propFound = false;
			if (typeof property === "number") {
				inc = property >= 0;
			} else if (typeof property === "string") {
				property = property.trim();
				if (property.length === 0) {
					continue;
				}

				if (INC_LIST.indexOf(property[0]) > -1) {
					inc = true;
					property = property.substring(1);
				} else if (DEC_LIST.indexOf(property[0]) > -1) {
					inc = false;
					property = property.substring(1);
				}
			} else if (property instanceof Array) {
				if (property.length !== array.length) {
					throw new Error(`Attempting to sort array of length ` +
							`${array.length} with array property of length ` +
							`${property.length}, arrays must be the same length`);
				}
				// Assume inc is true, since there's no means to specify otherwise
				inc = false;
				new_prev = property[prevData[1]];
				new_next = property[nextData[1]];
			} else {
				continue;
			}

			if (typeof property === "string" && property.length > 0) {
				if (prevNode !== null && nextNode !== null) {
					var new_prev_node = prevNode.find(property);
					var new_next_node = nextNode.find(property);
					if (new_prev_node !== undefined && new_next_node !== undefined) {
						propFound = true;
						new_prev = new_prev_node.getData();
						new_next = new_next_node.getData();
					}
				}

				if (!propFound) {
					var nestedList = property.split(".");

					new_prev = $.value(prev, ...nestedList);
					new_next = $.value(next, ...nestedList);
				}

				if (new_prev === undefined || new_next === undefined) {
					continue;
				}
				if (inc === undefined) {
					inc = false;
				}
			}

			if (inc === undefined) {
				continue;
			}

			if ((new_prev < new_next && inc)||
			    (new_prev > new_next && !inc)) {
				return -1;
			} else if ((new_prev > new_next && inc) ||
			           (new_prev < new_next && !inc)) {
				return 1;
			} else {
				isTie = true;
			}
			// If neither checks work, we have a tie, attempt again with
			// next property
		}

		// If we ended on a tie, stable sort the data
		if (isTie) {
			return prevData[1]-nextData[1];
		}

		// Otherwise try and sort the values as-is
		if (prev < next) {
			return -1;
		} else if (prev > next) {
			return 1;
		} else {
			return prevData[1]-nextData[1];
		}
	});

	for (let i = 0; i < arrayCopy.length; i+=1) {
		arrayCopy[i] = stableCopy[i][0];
	}

	return arrayCopy;
}

/**
 * Creates a grouped structure of headings given an array representing a
 * collection.  Each heading is represented by an object with an "id" property
 * corresponding to the mavo property value, a "property" property correspnding
 * to the mavo property name, and an "items" property corresponding to the
 * subgroups or collection items in this group.
 * @param {Array} array - array representing collection to group
 * @param {...string} properties - properties to group by
 */
Mavo.Functions.groupBy = function(array, ...properties) {
	var output = [];
	var indices = {};

	var sorted = Mavo.Functions.sort(array, ...properties);

	// TODO: What to do if too many groups
	for (let item of sorted) {
		if (item instanceof Mavo.Node) {
			item = item.getData();
		}

		var c_output = output;
		var c_indices = indices;
		var propVal = null;

		for (let property of properties) {
			if (INC_LIST.indexOf(property[0]) > -1 ||
			    DEC_LIST.indexOf(property[0]) > -1) {
				property = property.substring(1);
			}

			// TODO: For now, skip property that doesn't exist in array item
			if (item[property] !== undefined) {
				propVal = item[property];
				var i;
				if (!(propVal in c_indices)) {
					i = c_output.length;
					c_output.push({
						"id": propVal,
						"property": property,
						"items": []
					});

					c_indices[propVal] = {
						"i": i,
						"groups": {}
					};
				}
				i = c_indices[propVal].i;
				var group = c_output[i];
				c_output = group.items;
				c_indices = c_indices[propVal].groups;
			}
		}

		if (propVal !== null) {
			c_output.push(item);
		}
	}

	return output;
}

/**
 * Sorts the elements in the DOM corresponding to a collection based on the
 * properties given in sortProperties. sortProperties can either be a space
 * separated string of property names, or an array of string property names.
 * @param {Mavo.Collection} collection - collection whose elements we want to sort
 * @param {Array | string} properties - properties of the nodes in the
 * collection whose values we will use to compare for sorting
 */
Mavo.Collection.sortDOM = function(collection, properties) {
	if (typeof properties === "string") {
		properties = properties.trim();
		properties = properties.split(/\s*,\s*|\s+/).filter(val => val.length > 0);
	}

	var mavoNodes = collection.children;
	if (properties.length > 0) {
		mavoNodes = Mavo.Functions.sort(mavoNodes, ...properties);
	}
	var fragment = document.createDocumentFragment();
	for (let child of mavoNodes) {
		fragment.appendChild(child.element);
	}
	if (collection.bottomUp) {
		$.after(fragment, collection.marker);
	} else {
		$.before(fragment, collection.marker);
	}
}

Mavo.Collection.groupDOM = function(collection, properties) {
	if (typeof properties === "string") {
		properties = properties.trim();
		properties = properties.split(/\s*,\s*|\s+/).filter(val => val.length > 0);
	}

	var mavoNodes = collection.children;
	if (properties.length > 0) {
		mavoNodes = Mavo.Functions.sort(mavoNodes, ...properties);
		var groupObj = Mavo.Functions.groupBy(mavoNodes, ...properties);

		var fragment = document.createDocumentFragment();


	}
}

})(Bliss, Bliss.$);
