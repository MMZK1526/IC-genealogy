package mmzk.genealogy

class NameFormatter(
    val givenNames: MutableMap<Int, String> = mutableMapOf(),
    var maidenName: String? = null,
    var marriageName: String? = null,
) {

    val formattedName: String?
        get() {
            val givenName = if (givenNames.containsKey(0) && givenNames.size == 1) {
                givenNames[0]
            } else if (givenNames.isNotEmpty()) {
                givenNames.remove(0)
                givenNames.entries.toList().sortedBy { it.key }.joinToString(" ") { it.value }
            } else {
                null
            }
            val fullName = marriageName?.let { fn -> givenName?.let { gn -> "$fn, $gn" } ?: fn } ?: givenName
            return fullName?.let { fn -> maidenName?.let { mn -> "$fn, née $mn" } ?: fn } ?: maidenName?.let { "née $it" }
        }
}