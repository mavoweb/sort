(function($, $$) {

Mavo.attributes.push("mv-sort");

Mavo.Plugins.register("sort", {
	hooks: {
		'node-render-end': function(env) {
			if (env.context.nodeType == "Collection") {
				var element = env.context.element;
				if (element) {
					var sortProperties = element.getAttribute("mv-sort");
					if (sortProperties != null) {
						Mavo.Collection.sortDOM(env.context, sortProperties);
					}
				}
			}
		},
		'init-end': function(root) {
			if (root.element) {
				var observer = new Mavo.Observer(root.element, "mv-sort", records => {
					debugger;
					for (let record of records) {
						var element = record.target;
						var sortProperties = element.getAttribute("mv-sort");
						if (sortProperties != null) {
							var mavoCollection = Mavo.Collection.get(element);
							Mavo.Collection.sortDOM(mavoCollection, sortProperties);
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
 * values from objects in array to determine sorting order. If none provided,
 * will treat items in array as primitives and attempt to sort in increasing
 * order
 */
Mavo.Functions.sort = function(array, ...properties) {
	var arrayCopy = array.slice();

	if (array.length === 0) {
		return arrayCopy;
	}

	arrayCopy.sort(function(prev, next) {

		// If the elements in the array are Mavo nodes, sort by their data
		if (prev instanceof Mavo.Node) {
			prev = prev.getData();
		}
		if (next instanceof Mavo.Node) {
			next = next.getData();
		}

		// If it's an array of different types, we can't sort properly
		if (typeof prev !== typeof next) {
			return 0;
		}

		// If there's no properties, attempt to sort primitives in increasing
		// order by default
		if (properties.length === 0) {
			if (prev < next) {
				return -1;
			} else if (prev > next) {
				return 1;
			} else {
				return 0;
			}
		}

		// Sort objects by first property that doesn't result in a tie
		var isTie = false
		for (let property of properties) {
			isTie = false;
			var inc;
			if (typeof property === "number") {
				inc = property >= 0;
			} else if (typeof property === "string") {
				property = property.trim();
				if (property.length === 0) {
					continue;
				}
				var incList = ["+"];
				var decList = ["-"];

				if (incList.indexOf(property[0]) > -1) {
					inc = true;
					property = property.substring(1);
				} else if (decList.indexOf(property[0]) > -1) {
					inc = false;
					property = property.substring(1);
				}
			} else {
				continue;
			}

			var new_prev = prev, new_next = next;
			if (property.length > 0) {
				var nestedList = property.split(".");

				new_prev = $.value(prev, ...nestedList);
				new_next = $.value(next, ...nestedList);

				if (new_prev === undefined || new_next === undefined) {
					continue;
				}
				if (inc === undefined) {
					inc = true;
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

		// If we ended on a tie rather than a skip, return 0
		if (isTie) {
			return 0;
		}

		// Otherwise try and sort the values as-is
		if (prev < next) {
			return -1;
		} else if (prev > next) {
			return 1;
		} else {
			return 0;
		}
	});

	return arrayCopy;
}

/**
 * Sorts the elements in the DOM corresponding to a collection based on the
 * properties given in sortProperties. sortProperties can either be a space
 * separated string of property names, or an array of string property names.
 * @param {Mavo.Collection} collection - collection whose elements we want to sort
 * @param {Array | string} sortProperties - properties of the nodes in the
 * collection whose values we will use to compare for sorting
 */
Mavo.Collection.sortDOM = function(collection, sortProperties) {
	if (typeof sortProperties === "string") {
		sortProperties = sortProperties.split(/\s+/).filter(val => val.length > 0);
	}
	var children = collection.children;
	var sortedMavoNodes = Mavo.Functions.sort(children, ...sortProperties);
	var fragment = document.createDocumentFragment();
	for (child of sortedMavoNodes) {
		fragment.appendChild(child.element);
	}
	if (collection.bottomUp) {
		$.after(fragment, collection.marker);
	} else {
		$.before(fragment, collection.marker);
	}
}

})(Bliss, Bliss.$);
