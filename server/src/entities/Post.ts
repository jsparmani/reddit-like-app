import {Field, ObjectType} from "type-graphql";
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
    @Field()
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @CreateDateColumn({name: "created_at"})
    createdAt = new Date();

    @Field(() => String)
    @UpdateDateColumn({name: "updated_at"})
    updatedAt = new Date();

    @Field()
    @Column()
    title!: string;
}
