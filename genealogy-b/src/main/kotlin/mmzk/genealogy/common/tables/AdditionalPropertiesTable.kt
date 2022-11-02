package mmzk.genealogy.common.tables

import org.jetbrains.exposed.sql.Table

object AdditionalPropertiesTable: Table("additional_property") {
    val itemId = varchar("item_id", 32).primaryKey().references(ItemTable.id)
    val propertyId = varchar("property_id", 32).primaryKey().references(PropertyTypeTable.id)
    val value = text("value")
    val valueHash = text("value_hash").primaryKey()
}

object QualifierTable: Table("qualifier") {
    val itemId = varchar("item_id", 32).primaryKey().references(AdditionalPropertiesTable.itemId)
    val qualifierType = varchar("qualifier_type", 32).primaryKey().references(PropertyTypeTable.id)
    val value = text("value").nullable()
    val valueHash = text("value_hash").primaryKey().references(AdditionalPropertiesTable.valueHash).nullable()
    val propertyId = varchar("property_id", 32).references(AdditionalPropertiesTable.propertyId)
}