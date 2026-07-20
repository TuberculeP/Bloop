import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "./User";
import { LearningArticle } from "./LearningArticle";

@Entity()
@Unique(["user", "article"])
export class LearningArticleVote {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @ManyToOne(() => LearningArticle, (article) => article.votes, {
    onDelete: "CASCADE",
  })
  article: LearningArticle;

  @Column()
  value: number;

  @CreateDateColumn()
  createdAt: Date;
}
