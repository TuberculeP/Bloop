import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { LearningArticleVote } from "./LearningArticleVote";

@Entity()
export class LearningArticle {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true, type: "text" })
  excerpt: string;

  @Column("text")
  body: string;

  @Column({ nullable: true, type: "text" })
  coverImage: string;

  @ManyToOne(() => User)
  author: User;

  @Column({ default: "draft" })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  publishedAt: Date;

  @OneToMany(() => LearningArticleVote, (vote) => vote.article)
  votes: LearningArticleVote[];
}
