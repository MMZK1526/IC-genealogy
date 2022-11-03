package mmzk.genealogy.common.tables

import org.jetbrains.exposed.sql.Table

object AdditionalPropertyTable: Table("additional_property") {
    val itemId = varchar("item_id", 32).primaryKey().references(ItemTable.id)
    val propertyId = varchar("property_id", 32).primaryKey().references(PropertyTypeTable.id)
    val value = text("value")
    val valueHash = text("value_hash").primaryKey()
}

object QualifierTable: Table("qualifier") {
    val itemId = varchar("item_id", 32).primaryKey().references(AdditionalPropertyTable.itemId)
    val qualifierType = varchar("qualifier_type", 32).primaryKey().references(PropertyTypeTable.id)
    val value = text("value").nullable()
    val valueHash = text("value_hash").primaryKey().references(AdditionalPropertyTable.valueHash).nullable()
    val propertyId = varchar("property_id", 32).primaryKey().references(AdditionalPropertyTable.propertyId)
}