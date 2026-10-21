import type { MigrationInterface, QueryRunner } from "typeorm";

// Retrait de la messagerie et du Blog (fil social).
// migration:generate ne produit jamais de DROP TABLE pour une entité supprimée
// (TypeORM ignore les tables qu'il ne connaît pas), d'où cette migration manuelle.
// Ordre : tables de jointure / enfants d'abord.
const TABLES = [
  "message_like",
  "direct_message",
  "user_liked_posts_post",
  "post_tags_tag",
  "post",
  "tag",
];

export class RemoveMessagingAndBlog1792585978995 implements MigrationInterface {
  name = "RemoveMessagingAndBlog1792585978995";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      // ifExist, dropForeignKeys, dropIndices
      await queryRunner.dropTable(table, true, true, true);
    }
  }

  public async down(): Promise<void> {
    // Irréversible : restaurer depuis un backup si besoin.
  }
}
