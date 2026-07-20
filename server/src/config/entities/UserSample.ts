import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity("user_samples")
export class UserSample {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  filename: string;

  @Column("int", { default: 0 })
  size: number;

  @Column("float", { default: 0 })
  duration: number;

  @Column({ nullable: true })
  fullUrl: string;

  @ManyToOne(() => User, (user) => user.samples, { onDelete: "CASCADE" })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
