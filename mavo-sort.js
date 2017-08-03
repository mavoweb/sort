(function($, $$) {

Mavo.Plugins.register("sort", {});

Mavo.Functions.sort = function(array, ...properties) {
	var arrayCopy = array.slice();

	if (array.length === 0) {
		return arrayCopy;
	}

	arrayCopy.sort(function(prev, next) {
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
		for (var property of properties) {
			isTie = false;
			if (typeof property === 'number') {
				var inc = property >= 0;
			}
			if (typeof property != "string") {
				continue
			}
			property = property.trim();
			if (property.length === 0) {
				continue;
			}
			var inc = true;
			var incList = ["+"];
			var decList = ["-"];

			if (incList.indexOf(property[0]) > -1) {
				property = property.substring(1);
			} else if (decList.indexOf(property[0]) > -1) {
				inc = false;
				property = property.substring(1);
			}

			var new_prev = prev, new_next = next;
			if (typeof prev == 'object') {
				var nestedList = property.split(".");

				new_prev = $.value(prev, ...nestedList);
				new_next = $.value(next, ...nestedList);

				if (new_prev === undefined || new_next === undefined) {
					continue;
				}
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

})(Bliss, Bliss.$);
