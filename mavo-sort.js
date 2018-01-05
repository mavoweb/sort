/* global Bliss, Mavo */

(function($, $$) {

var SORT_ATTR = "mv-sort";
var GROUP_ATTR = "mv-groupby";
var INC_LIST = ["+"];
var DEC_LIST = ["-"];
var INC_DEFAULT = false;
var GROUP_HEADING = "mv-group-heading";
var GROUP_SYMBOL = Symbol("isGroup");

/**
 * Gets a unique array representing the given sorting criteria.
 * @param {Array | string} properties - properties of the items in the
 * collection whose values we will use to compare for sorting
 * @param {boolean} keepOrder - whether or not to have symbol dictating order in
 * front of property names
 * @returns {Array} array of strings with sorting properties
 */
var getFormattedProperties = function(properties, keepOrder) {
	if (properties === null || properties === undefined) {
		return [];
	}
	if (keepOrder === undefined) {
		keepOrder = true;
	}
	if (typeof properties === "string") {
		properties = properties.trim();
		properties = properties.split(/\s*,\s*|\s+/).filter(val => val.length > 0);
	}

	for (var i = 0; i < properties.length; i += 1) {
		var property = properties[i];
		if (typeof property === "string") {
			if (keepOrder) {
				if (INC_LIST.indexOf(property[0]) === -1 &&
						DEC_LIST.indexOf(property[0])	=== -1) {
					if (INC_DEFAULT) {
						properties[i] = INC_LIST[0] + property;
					} else {
						properties[i] = DEC_LIST[0] + property;
					}
				}
			} else if (INC_LIST.indexOf(property[0]) > -1 ||
			           DEC_LIST.indexOf(property[0])	> -1) {
				properties[i] = property.substring(1);
			}
		}
	}

	return properties;
}

/**
 * Gets a unique string representing the given sorting criteria.
 * @param {Array | string} properties - properties of the items in the
 * collection whose values we will use to compare for sorting
 * @returns {string} string representing sorting criteria
 */
var formatSortCriteria = function(properties) {
	properties = getFormattedProperties(properties, true);

	return properties.join();
}

Mavo.attributes.push(SORT_ATTR);
Mavo.attributes.push(GROUP_ATTR);

Mavo.Plugins.register("sort", {
	hooks: {
		"init-end": function(root) {
			var observer;
			if (root.element) {
				observer = new Mavo.Observer(root.element, SORT_ATTR, records => {
					for (let record of records) {
						var element = record.target;
						var properties = element.getAttribute(SORT_ATTR);
						if (properties !== null) {
							var collection = Mavo.Collection.get(element);
							var sortCriteria = formatSortCriteria(collection.sortedBy);
							properties = formatSortCriteria(properties);
							if (sortCriteria !== properties) {
								collection.sortDOM(properties);
							}
						}
					}
				}, {subtree: true});

				observer = new Mavo.Observer(root.element, GROUP_ATTR, records => {
					for (let record of records) {
						var element = record.target;
						var properties = element.getAttribute(GROUP_ATTR);
						if (properties !== null) {
							var collection = Mavo.Collection.get(element);
							var groupCriteria = formatSortCriteria(collection.groupedBy);
							properties = formatSortCriteria(properties);
							if (groupCriteria !== properties) {
								collection.groupDOM(properties);
							}
						}
					}
				}, {subtree: true})
			}
		},
		"node-render-end": function(env) {
			if (env.context.nodeType == "Collection") {
				var collection = env.context;
				var properties;

				properties = collection.element.getAttribute(SORT_ATTR);
				collection.sortDOM(properties);

				properties = collection.element.getAttribute(GROUP_ATTR);
				collection.groupDOM(properties);
			}
		},
		"render-end": function(env) {
			var root = env.context.root;

			root.element.addEventListener("mv-change", function(e) {
				if (e.node.mode == "read" &&
				    e.node.closestCollection !== null) {
					var collection = e.node.closestCollection;
					var properties, noOrdProps;

					properties = collection.element.getAttribute(SORT_ATTR);
					if (properties !== null) {
						noOrdProps = getFormattedProperties(properties, false);
						if (noOrdProps.indexOf(e.node.property) > -1) {
							collection.sortDOM(properties);
						}
					}

					properties = collection.element.getAttribute(GROUP_ATTR);
					if (properties !== null) {
						noOrdProps = getFormattedProperties(properties, false);
						if (noOrdProps.indexOf(e.node.property) > -1) {
							collection.groupDOM(properties);
						}
					}
				}
			});

			root.element.addEventListener("mv-done", function(e) {
				var node = e.node;
				if (node.nodeType === "Collection") {
					var properties;
					properties = node.element.getAttribute(SORT_ATTR);
					node.sortDOM(properties);

					properties = node.element.getAttribute(GROUP_ATTR);
					node.groupDOM(properties);
				}
			});
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
			prev = prev.getData({live: true});
		}
		if (next instanceof Mavo.Node) {
			nextNode = next;
			next = next.getData({live: true});
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
					continue;
				}

				inc = INC_DEFAULT;
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
						new_prev = new_prev_node.getData({live: true});
						new_next = new_next_node.getData({live: true});
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
					inc = INC_DEFAULT;
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
		var itemNode;
		if (item instanceof Mavo.Node) {
			// TODO: live: true unless optgroup?
			itemNode = item;
			item = item.getData({live: true});
		} else {
			itemNode = item[Mavo.toNode];
			if (itemNode !== undefined) {
				item = itemNode.getData({live: true});
			}
		}

		var c_output = output;
		var c_indices = indices;
		var propVal;

		for (let property of properties) {
			if (typeof property === "string") {
				if (INC_LIST.indexOf(property[0]) > -1 ||
						DEC_LIST.indexOf(property[0]) > -1) {
					property = property.substring(1);
				}

				property = property.trim();
				if (property.length === 0) {
					continue;
				}

				var propFound = false;
				if (itemNode !== undefined) {
					var newItemNode = itemNode.find(property);
					if (newItemNode !== undefined) {
						propFound = true;
						propVal = newItemNode.getData({live: true});
					}
				}

				if (!propFound) {
					var nestedList = property.split(".");
					propVal = $.value(item, ...nestedList);
				}
			} else if (property instanceof Array) {
				if (property.length !== array.length) {
					continue;
				}

				var index;
				if (itemNode !== undefined) {
					index = itemNode.index;
				}
				if (index !== undefined) {
					propVal = property[index];
					var node = property[Mavo.toNode];
					property = undefined;
					if (node !== undefined) {
						property = node.property;
					}
				}
			}

			if (propVal !== undefined && propVal !== null) {
				var i;
				if (!(propVal in c_indices)) {
					i = c_output.length;
					var params = {
						"id": propVal,
						"items": [],
						"isGroup": GROUP_SYMBOL
					}
					if (property !== undefined) {
						params.property = property;
					}
					c_output.push(params);

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

		if (propVal !== undefined && propVal !== null) {
			c_output.push(item);
		}
	}

	return output;
}

/**
 * If the element associated with this collection has an mv-sort attribute,
 * sorts the elements in the DOM corresponding to a collection based on the
 * properties given in mv-sort.
 * @param {Array | string} properties - properties of the nodes in the collection
 * whose values we will use to compare for sorting
 */
Mavo.Collection.prototype.sortDOM = function(properties) {
	if (properties !== null) {
		if (typeof properties === "string") {
			properties = properties.trim();
			properties = properties.split(/\s*,\s*|\s+/).filter(val => val.length > 0);
		}
		var mavoNodes = this.children;
		if (properties.length > 0) {
			mavoNodes = Mavo.Functions.sort(mavoNodes, ...properties);
		}
		var fragment = document.createDocumentFragment();
		for (let child of mavoNodes) {
			fragment.appendChild(child.element);
		}
		if (this.bottomUp) {
			$.after(fragment, this.marker);
		} else {
			$.before(fragment, this.marker);
		}

		this.sortedBy = formatSortCriteria(properties);
	}
}

/**
 * Groups the elements in the DOM corresponding to a collection based on the
 * properties given.  Inserts heading nodes between groups.
 * @param {Array | string} properties - properties of the nodes in the
 * collection whose values we will use to group
 */
Mavo.Collection.prototype.groupDOM = function(properties) {
	if (properties !== null) {
		properties = getFormattedProperties(properties, true);
		this.groupedBy = formatSortCriteria(properties);

		var createGroups = function(params) {
			var elem = params.elem;
			var items = params.items;
			var headingTemplate = params.headingTemplate;
			var collection = params.collection;
			for (var item of items) {
				var isGroup = false;

				if (item.isGroup === GROUP_SYMBOL) {
					isGroup = true;
				}

				// TODO: Start with GROUP_HEADER, expand for all cases
				if (isGroup) {
					var heading = headingTemplate.cloneNode(false);
					heading.textContent = item.id;
					if (collection.headings === undefined) {
						collection.headings = [];
					}
					collection.headings.push(heading);
					elem.appendChild(heading);
					createGroups({
						elem,
						headingTemplate,
						collection,
						items: item.items
					});
				} else {
					if (item[Mavo.toNode]) {
						item = item[Mavo.toNode];
					}
					elem.appendChild(item.element);
				}
			}
		}

		var fragment, heading;

		if (properties.length > 0) {
			var mavoNodes = this.children;
			mavoNodes = Mavo.Functions.sort(mavoNodes, ...properties);
			var groups = Mavo.Functions.groupBy(mavoNodes, ...properties);

			var element = this.element;
			var prev = element.previousElementSibling;
			var headingTemplate;

			if (this.headingTemplate) {
				headingTemplate = this.headingTemplate;
			} else if (prev !== null && prev.classList.contains(GROUP_HEADING)) {
				headingTemplate = prev;
				this.headingTemplate = headingTemplate;
				prev.remove();
			}

			if (headingTemplate) {
				fragment = document.createDocumentFragment();

				if (this.headings !== undefined) {
					for (heading of this.headings) {
						heading.remove();
					}
					this.headings = [];
				}

				createGroups({
					elem: fragment,
					items: groups,
					headingTemplate: headingTemplate,
					collection: this
				});

				if (this.bottomUp) {
					$.after(fragment, this.marker);
				} else {
					$.before(fragment, this.marker);
				}
			}
		} else {
			if (this.headings !== undefined) {
				for (heading of this.headings) {
					heading.remove();
				}
				this.headings = [];
			}

			fragment = document.createDocumentFragment();
			for (var child of this.children) {
				fragment.appendChild(child.element);
			}

			if (this.bottomUp) {
				$.after(fragment, this.marker);
			} else {
				$.before(fragment, this.marker);
			}

		}
	}
}

})(Bliss, Bliss.$);
