package mmzk.genealogy.common.tables

import org.jetbrains.exposed.sql.Table

object AdditionalPropertiesTable: Table("additional_properties") {
    val itemId = varchar("item_id", 32).primaryKey().references(ItemTable.id)
    val propertyId = varchar("property_id", 255).primaryKey().references(PropertyTypeTable.id)
    val value = text("value")
}
