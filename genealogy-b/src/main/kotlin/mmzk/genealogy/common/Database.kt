package mmzk.genealogy.common

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.net.URI
import mmzk.genealogy.common.dao.Item
import mmzk.genealogy.common.dao.Relationship
import mmzk.genealogy.common.dto.*
import mmzk.genealogy.common.tables.*
import mmzk.genealogy.common.tables.RelationshipTable.type
import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.statements.fillParameters
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction

object Database {
    private val dbUrl = System.getenv("DATABASE_URL")

    fun init() {
        Database.connect(hikari())
    }

    private fun hikari(): HikariDataSource {
        val config = HikariConfig()
        config.driverClassName = "org.postgresql.Driver"
        val url = URI(dbUrl)
        config.jdbcUrl = "jdbc:postgresql://" + url.host + url.path + "?sslmode=require"
        val (username, password) = url.userInfo.split(":")
        config.username = username
        config.password = password
        config.maximumPoolSize = 3
        config.isAutoCommit = false
        config.transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        config.addDataSourceProperty("reWriteBatchedInserts", true)
        config.validate()
        return HikariDataSource(config)
    }

    fun findItemByName(name: String): List<ItemDTO> = transaction {
        val statement = TransactionManager.current().connection.prepareStatement(
            """
            SELECT indexed_item.*, ts_rank_cd(indexed_aliases, query) AS rank
            FROM indexed_item, websearch_to_tsquery(?) as query
            WHERE indexed_aliases @@ query
            ORDER BY rank DESC
            LIMIT 20;
        """.trimIndent()
        )
        statement.fillParameters(listOf(TextColumnType() to name))
        val resultSet = statement.executeQuery()
        val list = mutableListOf<Item>()
        val fields: List<Expression<*>> = listOf(ItemTable.name, ItemTable.id, ItemTable.description, ItemTable.aliases)
        while (resultSet.next()) {
            val resultRow = ResultRow.create(resultSet, fields)
            list.add(Item.wrapRow(resultRow))
        }
        list.toDTOWithAdditionalProperties()
    }

    fun insertItems(items: List<ItemDTO>) = transaction {
        ItemTable.batchInsert(items, ignore = true) { item ->
            this[ItemTable.id] = EntityID(item.id, ItemTable)
            this[ItemTable.name] = item.name
            this[ItemTable.description] = item.description
            this[ItemTable.aliases] = item.aliases
        }

        val props = items.flatMap { item ->
            item.additionalProperties.map { item.id to it }
        }
        AdditionalPropertyTable.batchInsert(props, ignore = true) { (id, property) ->
            this[AdditionalPropertyTable.itemId] = id
            this[AdditionalPropertyTable.propertyId] = property.propertyId
            this[AdditionalPropertyTable.value] = property.value
            this[AdditionalPropertyTable.valueHash] = property.valueHash
        }

        val qualifiers = props.flatMap { (id, prop) ->
            prop.qualifiers.map { Triple(id, prop, it) }
        }

        QualifierTable.batchInsert(qualifiers, ignore = true) { (id, property, qualifier) ->
            this[QualifierTable.itemId] = id
            this[QualifierTable.qualifierType] = qualifier.typeId
            this[QualifierTable.value] = qualifier.value
            this[QualifierTable.valueHash] = property.valueHash
            this[QualifierTable.propertyId] = property.propertyId
        }
    }

    fun insertRelations(relations: List<RelationshipDTO>) = transaction {
        RelationshipTable.batchInsert(relations, ignore = true) { relation ->
            this[RelationshipTable.item1] = EntityID(relation.item1Id, ItemTable)
            this[RelationshipTable.item2] = EntityID(relation.item2Id, ItemTable)
            this[RelationshipTable.type] = EntityID(relation.typeId, PropertyTypeTable)
        }
    }

    fun insertProperties(propertyMap: Map<String, String>) = transaction {
        PropertyTypeTable.batchInsert(propertyMap.entries, ignore = true) { propertyEntry ->
            this[PropertyTypeTable.id] = EntityID(propertyEntry.key, PropertyTypeTable)
            this[PropertyTypeTable.name] = propertyEntry.value
        }
    }

    private fun findRelatedItems(
        ids: Set<String>,
        homoStrata: Set<String>,
        heteroStrata: Set<String>
    ): Triple<Set<RelationshipDTO>, MutableMap<String, MutableList<String>>, MutableMap<String, MutableList<String>>> {
        val relationships = Relationship.find {
            RelationshipTable.item2.asStringColumn.inList(ids) and
                    type.asStringColumn.inList(homoStrata + heteroStrata)
        }

        val sameLevelNewItems = mutableMapOf<String, MutableList<String>>()
        val differentLevelNewItems = mutableMapOf<String, MutableList<String>>()
        for (relation in relationships) {
            if (homoStrata.contains(relation.type.id.value)) {
                sameLevelNewItems.getOrPut(relation.item1.id.value) { mutableListOf() }.add(relation.item2.id.value)
            } else {
                differentLevelNewItems.getOrPut(relation.item1.id.value) { mutableListOf() }
                    .add(relation.item2.id.value)
            }
        }
        differentLevelNewItems -= sameLevelNewItems.keys

        return Triple(
            relationships.mapTo(mutableSetOf(), ::RelationshipDTO),
            sameLevelNewItems, differentLevelNewItems
        )
    }

    fun findRelatedItems(
        id: String,
        homoStrata: Set<String>,
        heteroStrata: Set<String>,
        depth: Int,
        visited: MutableSet<String>
    ) =
        transaction {
            var frontier = mapOf(id to 0)
            val targets = Item.find {
                ItemTable.id.asStringColumn.inList(frontier.keys)
            }.toDTOWithAdditionalProperties()
            val items = mutableSetOf<ItemDTO>()
            val relations = mutableSetOf<RelationshipDTO>()

            while (frontier.isNotEmpty()) {
                val newPeople = Item.find {
                    ItemTable.id.asStringColumn.inList(frontier.keys)
                }.toDTOWithAdditionalProperties()
                items.addAll(newPeople)
                visited.addAll(newPeople.map { it.id })
                val (newRelations, nextSameLevelItems, nextDifferentLevelItems) = findRelatedItems(
                    frontier.keys,
                    homoStrata,
                    heteroStrata
                )

                frontier = nextSameLevelItems.map { it.key to it.value.minOf { value -> frontier[value]!! } }
                    .filter { !visited.contains(it.first) && it.second <= depth }
                    .toMap() + nextDifferentLevelItems.map { it.key to it.value.minOf { value -> frontier[value]!! } + 1 }
                    .filter { !visited.contains(it.first) && it.second <= depth }
                relations.addAll(newRelations.filter { (visited.contains(it.item1Id) || frontier.contains(it.item1Id)) })
            }

            RelationsResponse(targets, items.map { it.id to it }.toMap(), relations.toList().groupBy { it.item2Id })
        }

    private fun Iterable<Item>.toDTOWithAdditionalProperties(): List<ItemDTO> {
        val qualifiersByItem =
            AllPropertiesAndQualifiersView.select {
                AllPropertiesAndQualifiersView.id.inList(this@toDTOWithAdditionalProperties.map { it.id.value })
            }
                .groupBy { it[AllPropertiesAndQualifiersView.id] }
                .mapValues { (_, v) ->
                    v.groupBy { it[AllPropertiesAndQualifiersView.propertyId] to it[AllPropertiesAndQualifiersView.valueHash] }
                }
        return this.map { dao ->
            val qualifiersByProperty = qualifiersByItem[dao.id.value] ?: mapOf()
            val properties = qualifiersByProperty.values.mapNotNullTo(mutableSetOf()) { rows ->
                val qualifiers =
                    rows.mapNotNullTo(mutableSetOf(), QualifierDTO::fromAllPropertiesAndQualifiersResultRow)
                AdditionalPropertyDTO.fromAllPropertiesAndQualifiersResultRow(rows[0], qualifiers)
            }
            ItemDTO(dao, properties)
        }
    }

    private val Column<EntityID<String>>.asStringColumn get() = castTo<String>(VarCharColumnType(32))
}
