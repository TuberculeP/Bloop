import { MigrationInterface, QueryRunner } from "typeorm";

// Baseline: full schema. Skipped on databases that already have it (created by `synchronize`).
export class InitialSchema1792585978994 implements MigrationInterface {
  name = "InitialSchema1792585978994";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("user")) return;

    await queryRunner.query(`
            CREATE TABLE "tag" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8e4052373c579afc1471f526760" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "post" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "body" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "isActive" boolean NOT NULL DEFAULT true,
                "is_highlight" boolean NOT NULL DEFAULT false,
                "pinned_by_user" boolean NOT NULL DEFAULT false,
                "authorId" uuid,
                "commentOfId" uuid,
                CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "subscription" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "digest_id" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" text NOT NULL,
                "price" numeric(10, 2) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "isActive" boolean NOT NULL DEFAULT true,
                CONSTRAINT "UQ_b3aaacb4d4fa08b681bf5bc47c8" UNIQUE ("digest_id"),
                CONSTRAINT "PK_8c3e00ebd02103caa1174cd5d9d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "message_like" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid,
                "messageId" uuid,
                CONSTRAINT "UQ_6592b0a0d85584a6d0064ff2644" UNIQUE ("userId", "messageId"),
                CONSTRAINT "PK_2f3e23d3c20a8453b42c5b5b862" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_samples" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "filename" character varying NOT NULL,
                "size" integer NOT NULL DEFAULT '0',
                "duration" double precision NOT NULL DEFAULT '0',
                "fullUrl" character varying,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8ee0c920634b2491fb4febce12d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password" character varying,
                "googleId" character varying,
                "firstName" character varying NOT NULL,
                "lastName" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "role" character varying NOT NULL DEFAULT 'ROLE_USER',
                "profilePicture" text,
                "storageUsedBytes" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "resetToken" character varying,
                "resetTokenExpiry" TIMESTAMP,
                CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
                CONSTRAINT "UQ_470355432cc67b2c470c30bef7c" UNIQUE ("googleId"),
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "direct_message" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "body" text NOT NULL,
                "isRead" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "isActive" boolean NOT NULL DEFAULT true,
                "senderId" uuid,
                "receiverId" uuid,
                CONSTRAINT "PK_84576da17e6ab7b3c633c58fc54" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "project" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "data" text NOT NULL,
                "mcpEnabled" boolean NOT NULL DEFAULT false,
                "isPublic" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" date,
                "userId" uuid,
                CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "audio_samples" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "filename" character varying NOT NULL,
                "duration" double precision NOT NULL DEFAULT '0',
                "folderId" uuid NOT NULL,
                "previewUrl" character varying,
                "fullUrl" character varying,
                CONSTRAINT "PK_88836a32eb28be538382e35e80a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "sample_folders" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "order" integer NOT NULL DEFAULT '0',
                "packId" uuid NOT NULL,
                CONSTRAINT "PK_4fd3ab89041fae28a56dda1af7e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "sample_packs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "slug" character varying NOT NULL,
                "name" character varying NOT NULL,
                "author" character varying,
                "cover" character varying,
                "featured" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_39cc4606cc3a51c540d77c677dc" UNIQUE ("slug"),
                CONSTRAINT "PK_943d53e1a021ac70a5e5ca6b596" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "o_auth_token" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "accessTokenHash" character varying NOT NULL,
                "refreshTokenHash" character varying,
                "expiresAt" TIMESTAMP,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f627e7380e58f41d1157094c0d3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "project_favorite" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid,
                "projectId" uuid,
                CONSTRAINT "UQ_7865041f4f54ad28b21197da01d" UNIQUE ("userId", "projectId"),
                CONSTRAINT "PK_91aa433adcbbbcafb5116fd8bfd" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_sample_project_links" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sampleId" uuid NOT NULL,
                "projectId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_31da4cb958f4187caf087432d65" UNIQUE ("sampleId", "projectId"),
                CONSTRAINT "PK_b07c06e4f0263cf57fe5af41e3e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_313cfd2d88d2e547b99c26514b" ON "user_sample_project_links" ("sampleId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_622d4a7c3d6461ae3aa1cd5b43" ON "user_sample_project_links" ("projectId")
        `);
    await queryRunner.query(`
            CREATE TABLE "learning_article_vote" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "value" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid,
                "articleId" uuid,
                CONSTRAINT "UQ_3f68e9553aaa9790ecfb3c74713" UNIQUE ("userId", "articleId"),
                CONSTRAINT "PK_7431a8a6264af47f4bdd0b400a6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "learning_article" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying NOT NULL,
                "slug" character varying NOT NULL,
                "excerpt" text,
                "body" text NOT NULL,
                "coverImage" text,
                "status" character varying NOT NULL DEFAULT 'draft',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "publishedAt" TIMESTAMP,
                "authorId" uuid,
                CONSTRAINT "UQ_3db56f3ae160268668ff0891ecf" UNIQUE ("slug"),
                CONSTRAINT "PK_d3de9f499a66c2b7740af6ad963" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "post_tags_tag" (
                "postId" uuid NOT NULL,
                "tagId" uuid NOT NULL,
                CONSTRAINT "PK_e9b7b8e6a07bdccb6a954171676" PRIMARY KEY ("postId", "tagId")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_b651178cc41334544a7a9601c4" ON "post_tags_tag" ("postId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_41e7626b9cc03c5c65812ae55e" ON "post_tags_tag" ("tagId")
        `);
    await queryRunner.query(`
            CREATE TABLE "user_liked_posts_post" (
                "userId" uuid NOT NULL,
                "postId" uuid NOT NULL,
                CONSTRAINT "PK_d4060b23ca4161e5626b703e8fe" PRIMARY KEY ("userId", "postId")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_6199124c646dd9a89215eaa80d" ON "user_liked_posts_post" ("userId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2fa174d02cadc279ba767cf199" ON "user_liked_posts_post" ("postId")
        `);
    await queryRunner.query(`
            ALTER TABLE "post"
            ADD CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "post"
            ADD CONSTRAINT "FK_47c1abe96d72955f44eb48616d7" FOREIGN KEY ("commentOfId") REFERENCES "post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "message_like"
            ADD CONSTRAINT "FK_3881f73993b94e32f511f2e2c10" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "message_like"
            ADD CONSTRAINT "FK_37146585c3b4b2b1a044151a1d4" FOREIGN KEY ("messageId") REFERENCES "direct_message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_samples"
            ADD CONSTRAINT "FK_fce3a0ed94ce33b96b49f3b24a3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "direct_message"
            ADD CONSTRAINT "FK_ef4a6edf9cbba6b2ec249243382" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "direct_message"
            ADD CONSTRAINT "FK_ca2481679ba6f268b7db58042bc" FOREIGN KEY ("receiverId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "project"
            ADD CONSTRAINT "FK_7c4b0d3b77eaf26f8b4da879e63" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "audio_samples"
            ADD CONSTRAINT "FK_be6f22cafe557951a02f3f9938e" FOREIGN KEY ("folderId") REFERENCES "sample_folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "sample_folders"
            ADD CONSTRAINT "FK_c5027ff03bce034bebad061b4fc" FOREIGN KEY ("packId") REFERENCES "sample_packs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "o_auth_token"
            ADD CONSTRAINT "FK_cacccc1796e11c9350fc1544328" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "project_favorite"
            ADD CONSTRAINT "FK_5842121a61ef679d716fd9fdd99" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "project_favorite"
            ADD CONSTRAINT "FK_619aea1258ffec61d1c4022b7c5" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_sample_project_links"
            ADD CONSTRAINT "FK_313cfd2d88d2e547b99c26514b2" FOREIGN KEY ("sampleId") REFERENCES "user_samples"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_sample_project_links"
            ADD CONSTRAINT "FK_622d4a7c3d6461ae3aa1cd5b438" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "learning_article_vote"
            ADD CONSTRAINT "FK_84a34aa63a0abb2aa2d9889ca7b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "learning_article_vote"
            ADD CONSTRAINT "FK_32eaac05e49487f6442e8522605" FOREIGN KEY ("articleId") REFERENCES "learning_article"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "learning_article"
            ADD CONSTRAINT "FK_c7f18097bed24e7379e73ead5f3" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "post_tags_tag"
            ADD CONSTRAINT "FK_b651178cc41334544a7a9601c45" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "post_tags_tag"
            ADD CONSTRAINT "FK_41e7626b9cc03c5c65812ae55e8" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_liked_posts_post"
            ADD CONSTRAINT "FK_6199124c646dd9a89215eaa80d4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "user_liked_posts_post"
            ADD CONSTRAINT "FK_2fa174d02cadc279ba767cf199e" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_liked_posts_post" DROP CONSTRAINT "FK_2fa174d02cadc279ba767cf199e"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_liked_posts_post" DROP CONSTRAINT "FK_6199124c646dd9a89215eaa80d4"
        `);
    await queryRunner.query(`
            ALTER TABLE "post_tags_tag" DROP CONSTRAINT "FK_41e7626b9cc03c5c65812ae55e8"
        `);
    await queryRunner.query(`
            ALTER TABLE "post_tags_tag" DROP CONSTRAINT "FK_b651178cc41334544a7a9601c45"
        `);
    await queryRunner.query(`
            ALTER TABLE "learning_article" DROP CONSTRAINT "FK_c7f18097bed24e7379e73ead5f3"
        `);
    await queryRunner.query(`
            ALTER TABLE "learning_article_vote" DROP CONSTRAINT "FK_32eaac05e49487f6442e8522605"
        `);
    await queryRunner.query(`
            ALTER TABLE "learning_article_vote" DROP CONSTRAINT "FK_84a34aa63a0abb2aa2d9889ca7b"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_sample_project_links" DROP CONSTRAINT "FK_622d4a7c3d6461ae3aa1cd5b438"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_sample_project_links" DROP CONSTRAINT "FK_313cfd2d88d2e547b99c26514b2"
        `);
    await queryRunner.query(`
            ALTER TABLE "project_favorite" DROP CONSTRAINT "FK_619aea1258ffec61d1c4022b7c5"
        `);
    await queryRunner.query(`
            ALTER TABLE "project_favorite" DROP CONSTRAINT "FK_5842121a61ef679d716fd9fdd99"
        `);
    await queryRunner.query(`
            ALTER TABLE "o_auth_token" DROP CONSTRAINT "FK_cacccc1796e11c9350fc1544328"
        `);
    await queryRunner.query(`
            ALTER TABLE "sample_folders" DROP CONSTRAINT "FK_c5027ff03bce034bebad061b4fc"
        `);
    await queryRunner.query(`
            ALTER TABLE "audio_samples" DROP CONSTRAINT "FK_be6f22cafe557951a02f3f9938e"
        `);
    await queryRunner.query(`
            ALTER TABLE "project" DROP CONSTRAINT "FK_7c4b0d3b77eaf26f8b4da879e63"
        `);
    await queryRunner.query(`
            ALTER TABLE "direct_message" DROP CONSTRAINT "FK_ca2481679ba6f268b7db58042bc"
        `);
    await queryRunner.query(`
            ALTER TABLE "direct_message" DROP CONSTRAINT "FK_ef4a6edf9cbba6b2ec249243382"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_samples" DROP CONSTRAINT "FK_fce3a0ed94ce33b96b49f3b24a3"
        `);
    await queryRunner.query(`
            ALTER TABLE "message_like" DROP CONSTRAINT "FK_37146585c3b4b2b1a044151a1d4"
        `);
    await queryRunner.query(`
            ALTER TABLE "message_like" DROP CONSTRAINT "FK_3881f73993b94e32f511f2e2c10"
        `);
    await queryRunner.query(`
            ALTER TABLE "post" DROP CONSTRAINT "FK_47c1abe96d72955f44eb48616d7"
        `);
    await queryRunner.query(`
            ALTER TABLE "post" DROP CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2fa174d02cadc279ba767cf199"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_6199124c646dd9a89215eaa80d"
        `);
    await queryRunner.query(`
            DROP TABLE "user_liked_posts_post"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_41e7626b9cc03c5c65812ae55e"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b651178cc41334544a7a9601c4"
        `);
    await queryRunner.query(`
            DROP TABLE "post_tags_tag"
        `);
    await queryRunner.query(`
            DROP TABLE "learning_article"
        `);
    await queryRunner.query(`
            DROP TABLE "learning_article_vote"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_622d4a7c3d6461ae3aa1cd5b43"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_313cfd2d88d2e547b99c26514b"
        `);
    await queryRunner.query(`
            DROP TABLE "user_sample_project_links"
        `);
    await queryRunner.query(`
            DROP TABLE "project_favorite"
        `);
    await queryRunner.query(`
            DROP TABLE "o_auth_token"
        `);
    await queryRunner.query(`
            DROP TABLE "sample_packs"
        `);
    await queryRunner.query(`
            DROP TABLE "sample_folders"
        `);
    await queryRunner.query(`
            DROP TABLE "audio_samples"
        `);
    await queryRunner.query(`
            DROP TABLE "project"
        `);
    await queryRunner.query(`
            DROP TABLE "direct_message"
        `);
    await queryRunner.query(`
            DROP TABLE "user"
        `);
    await queryRunner.query(`
            DROP TABLE "user_samples"
        `);
    await queryRunner.query(`
            DROP TABLE "message_like"
        `);
    await queryRunner.query(`
            DROP TABLE "subscription"
        `);
    await queryRunner.query(`
            DROP TABLE "post"
        `);
    await queryRunner.query(`
            DROP TABLE "tag"
        `);
  }
}
