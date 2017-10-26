# Mavo Sort

Sort collections in your Mavos!

---
## sort()

Use `sort` in expressions to produce a sorted collection.

### Example
In one part of our app, say we've defined an arbitrary collection of primitives named `things`.
```
<div mv-multiple="things">...</div>
```

If we'd like to show a sorted version of this collection in another part of our app, we can do something like:
```
<div property="other_things" mv-multiple mv-value="sort(collection, '-')">...</div>
```

And this would produce a sorted version of the collection in decreasing order.

### Usage
`sort(array, ...props)`
* `array` is the array you'd like to sort.  You can use the name of a collection here and it will be resolved to the proper array.
* `...props`
    * If you are sorting a collection of **primitives**, then the only other argument `sort` needs is the order to sort in.  By default, `sort` will attempt to sort in increasing order, so to sort primitives in decreasing order, simply specify `"-"` as the second argument.
    * If you are sorting a collection of **groups**, you can supply a variable number of properties of the groups to sort by.  The first specified property will take priority, and if there are ties within this property, then the next property is used to attempt to break those ties.  You can supply as many properties to break as many ties as desired.  Each property can be preficed with a `"-"` to sort by that property value in decreasing order.

#### Collections of primitives
| Example | Output | Explanation |
|---------|--------|-------------|
|`sort([5, -3, -1, 2, 3])` | `-3, -1, 2, 3, 5` | If no properties specifies, sorts primitives in increasing order by default.|
|`sort([5, -3, -1, 2, 3], "-")` | `5, 3, 2, -1, -3` | Decreasing order specified.|

#### Collections of groups
| Example | Output |Explanation |
|---------|--------|-------------|
| `sort(collection_name, "-prop1", "prop2")` | A new collection sorted by the `prop1` property of each group in decreasing order.  Any ties in `prop1` are sorted by `prop2` in increasing order. | Assume `collection_name` is the name of a collection of groups, where each group has two properties: `prop1` and `prop2`.|

Note that if you do not need to sort in decreasing order, then you can simply provide the property name without quotes.  For example, the equivalent of the collection of groups example above would be:
`sort(collection_name, "-prop1", prop2)`
Notice that `prop2` did not need any quotes, but `prop1` did.

---
## mv-sort
Attach `mv-sort` as an attribute on where a collection is initially declared to display the sorted version of the underlying collection.

### Examples
#### Collections of Primitives
Say we've defined an arbitrary collection of primitives named `things`, and we want to sort it in increasing order.  We can accomplish this with:
```
<div mv-multiple="things" mv-sort="+"></div>
```
Or for decreasing order:
```
<div mv-multiple="things" mv-sort="-"></div>
```

Note that the following two examples will **not** sort the collection:
```
<div mv-multiple="things" mv-sort></div>
```
```
<div mv-multiple="things" mv-sort=""></div>
```

#### Collections of Groups
Say our `things` collection has a bit more complex structure.  We can specify how to sort it by specifying the properties to sort it by. The following example will sort `things` by `prop31` in decreasing order, and will break any ties by sorting those ties by `prop12` in increasing order:
```
<div mv-multiple="things" mv-sort="-prop31 prop12">
	<div property="prop11">
		<div property="prop21">
			<div property="prop31"></div>
		</div>
	</div>
	<div property="prop12"></div>
</div>
```

#### Updating Sort
We can use expressions to have our list resort itself based on a property!
Let's use our `things` collection again, but this time specify how to sort it
using a `select` menu.
```
<div mv-storage="none">
	<select property="sortProp">
		<option value="prop1">Property 1</option>
		<option value="prop2">Property 2</option>
		<option value="prop3">Property 3</option>
	</select>
	<div mv-multiple="things" mv-sort="[sortProp]">
		<div property="prop1"></div>
		<div property="prop2"></div>
		<div property="prop3"></div>
	</div>
</div>

```

### Usage
`mv-sort="prop1 prop2 prop3 ..."`

`mv-sort` simply takes a space _or_ comma separated list of properties to sort by, where each property is prefixed with a `+` or a `-` to specify increasing or decreasing order respectively for that property.  If the underlying collection just has primitives, then you only need to provide a `+` or `-` to specify increasing or decreasing order respectively.  Make sure to attach it to an `mv-multiple` element.

