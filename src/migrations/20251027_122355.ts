import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`products\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`medusa_id\` text NOT NULL,
  	\`title\` text NOT NULL,
  	\`handle\` text NOT NULL,
  	\`description\` text,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`thumbnail\` text,
  	\`metadata\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`additional_content\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`products_medusa_id_idx\` ON \`products\` (\`medusa_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`products_handle_idx\` ON \`products\` (\`handle\`);`)
  await db.run(sql`CREATE INDEX \`products_updated_at_idx\` ON \`products\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`products_created_at_idx\` ON \`products\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`product_variants\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`medusa_id\` text NOT NULL,
  	\`product_id\` integer NOT NULL,
  	\`title\` text NOT NULL,
  	\`sku\` text,
  	\`barcode\` text,
  	\`prices\` text,
  	\`options\` text,
  	\`inventory_manage_inventory\` integer DEFAULT true,
  	\`inventory_allow_backorder\` integer DEFAULT false,
  	\`metadata\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`product_variants_medusa_id_idx\` ON \`product_variants\` (\`medusa_id\`);`)
  await db.run(sql`CREATE INDEX \`product_variants_product_idx\` ON \`product_variants\` (\`product_id\`);`)
  await db.run(sql`CREATE INDEX \`product_variants_updated_at_idx\` ON \`product_variants\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`product_variants_created_at_idx\` ON \`product_variants\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`product_options_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`value\` text NOT NULL,
  	\`medusa_value_id\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`product_options\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`product_options_values_order_idx\` ON \`product_options_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`product_options_values_parent_id_idx\` ON \`product_options_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`product_options\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`medusa_id\` text NOT NULL,
  	\`product_id\` integer NOT NULL,
  	\`title\` text NOT NULL,
  	\`metadata\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`product_options_medusa_id_idx\` ON \`product_options\` (\`medusa_id\`);`)
  await db.run(sql`CREATE INDEX \`product_options_product_idx\` ON \`product_options\` (\`product_id\`);`)
  await db.run(sql`CREATE INDEX \`product_options_updated_at_idx\` ON \`product_options\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`product_options_created_at_idx\` ON \`product_options\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`subheading\` text,
  	\`background_image_id\` integer,
  	\`overlay_opacity\` numeric DEFAULT 40,
  	\`text_align\` text DEFAULT 'center',
  	\`height\` text DEFAULT 'large',
  	\`cta_text\` text,
  	\`cta_link\` text,
  	\`cta_style\` text DEFAULT 'primary',
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_order_idx\` ON \`pages_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_parent_id_idx\` ON \`pages_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_path_idx\` ON \`pages_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_background_image_idx\` ON \`pages_blocks_hero\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_featured_products\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`description\` text,
  	\`display_mode\` text DEFAULT 'manual',
  	\`limit\` numeric DEFAULT 4,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '4',
  	\`show_price\` integer DEFAULT true,
  	\`show_quick_view\` integer DEFAULT false,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_featured_products_order_idx\` ON \`pages_blocks_featured_products\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_featured_products_parent_id_idx\` ON \`pages_blocks_featured_products\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_featured_products_path_idx\` ON \`pages_blocks_featured_products\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_text\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`content\` text,
  	\`width\` text DEFAULT 'normal',
  	\`text_align\` text DEFAULT 'left',
  	\`background_color\` text DEFAULT 'transparent',
  	\`padding\` text DEFAULT 'normal',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_text_order_idx\` ON \`pages_blocks_text\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_text_parent_id_idx\` ON \`pages_blocks_text\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_text_path_idx\` ON \`pages_blocks_text\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_image_gallery_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`caption\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_image_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_images_order_idx\` ON \`pages_blocks_image_gallery_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_images_parent_id_idx\` ON \`pages_blocks_image_gallery_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_images_image_idx\` ON \`pages_blocks_image_gallery_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_image_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`aspect_ratio\` text DEFAULT 'square',
  	\`enable_lightbox\` integer DEFAULT true,
  	\`gap\` text DEFAULT 'normal',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_order_idx\` ON \`pages_blocks_image_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_parent_id_idx\` ON \`pages_blocks_image_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_path_idx\` ON \`pages_blocks_image_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_cta_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`link\` text,
  	\`style\` text DEFAULT 'primary',
  	\`open_in_new_tab\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_cta\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_buttons_order_idx\` ON \`pages_blocks_cta_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_buttons_parent_id_idx\` ON \`pages_blocks_cta_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`description\` text,
  	\`layout\` text DEFAULT 'centered',
  	\`background_image_id\` integer,
  	\`background_color\` text DEFAULT 'gray-50',
  	\`overlay_opacity\` numeric DEFAULT 60,
  	\`padding\` text DEFAULT 'large',
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_order_idx\` ON \`pages_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_parent_id_idx\` ON \`pages_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_path_idx\` ON \`pages_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_background_image_idx\` ON \`pages_blocks_cta\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_video\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`video_type\` text DEFAULT 'youtube',
  	\`video_id\` text,
  	\`video_url\` text,
  	\`poster_image_id\` integer,
  	\`aspect_ratio\` text DEFAULT '16:9',
  	\`caption\` text,
  	\`autoplay\` integer DEFAULT false,
  	\`loop\` integer DEFAULT false,
  	\`controls\` integer DEFAULT true,
  	\`width\` text DEFAULT 'normal',
  	\`block_name\` text,
  	FOREIGN KEY (\`poster_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_video_order_idx\` ON \`pages_blocks_video\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_video_parent_id_idx\` ON \`pages_blocks_video\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_video_path_idx\` ON \`pages_blocks_video\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_video_poster_image_idx\` ON \`pages_blocks_video\` (\`poster_image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_testimonials_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`quote\` text,
  	\`customer_name\` text,
  	\`customer_title\` text,
  	\`customer_image_id\` integer,
  	\`rating\` numeric,
  	FOREIGN KEY (\`customer_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_testimonials\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_testimonials_testimonials_order_idx\` ON \`pages_blocks_testimonials_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_testimonials_testimonials_parent_id_idx\` ON \`pages_blocks_testimonials_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_testimonials_testimonials_customer_image_idx\` ON \`pages_blocks_testimonials_testimonials\` (\`customer_image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`show_images\` integer DEFAULT true,
  	\`show_ratings\` integer DEFAULT true,
  	\`background_color\` text DEFAULT 'white',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_testimonials_order_idx\` ON \`pages_blocks_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_testimonials_parent_id_idx\` ON \`pages_blocks_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_testimonials_path_idx\` ON \`pages_blocks_testimonials\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`status\` text DEFAULT 'draft',
  	\`published_at\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_keywords\` text,
  	\`seo_image_id\` integer,
  	\`seo_no_index\` integer DEFAULT false,
  	\`seo_canonical\` text,
  	\`custom_c_s_s\` text,
  	\`custom_j_s\` text,
  	\`layout\` text DEFAULT 'default',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`seo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_status_idx\` ON \`pages\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`pages_seo_seo_image_idx\` ON \`pages\` (\`seo_image_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`pages_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`products_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`products_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_rels_order_idx\` ON \`pages_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_parent_idx\` ON \`pages_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_path_idx\` ON \`pages_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_products_id_idx\` ON \`pages_rels\` (\`products_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`subheading\` text,
  	\`background_image_id\` integer,
  	\`overlay_opacity\` numeric DEFAULT 40,
  	\`text_align\` text DEFAULT 'center',
  	\`height\` text DEFAULT 'large',
  	\`cta_text\` text,
  	\`cta_link\` text,
  	\`cta_style\` text DEFAULT 'primary',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_order_idx\` ON \`_pages_v_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_parent_id_idx\` ON \`_pages_v_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_path_idx\` ON \`_pages_v_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_background_image_idx\` ON \`_pages_v_blocks_hero\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_featured_products\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`description\` text,
  	\`display_mode\` text DEFAULT 'manual',
  	\`limit\` numeric DEFAULT 4,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '4',
  	\`show_price\` integer DEFAULT true,
  	\`show_quick_view\` integer DEFAULT false,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_featured_products_order_idx\` ON \`_pages_v_blocks_featured_products\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_featured_products_parent_id_idx\` ON \`_pages_v_blocks_featured_products\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_featured_products_path_idx\` ON \`_pages_v_blocks_featured_products\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_text\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`content\` text,
  	\`width\` text DEFAULT 'normal',
  	\`text_align\` text DEFAULT 'left',
  	\`background_color\` text DEFAULT 'transparent',
  	\`padding\` text DEFAULT 'normal',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_text_order_idx\` ON \`_pages_v_blocks_text\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_text_parent_id_idx\` ON \`_pages_v_blocks_text\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_text_path_idx\` ON \`_pages_v_blocks_text\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_image_gallery_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`caption\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_image_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_images_order_idx\` ON \`_pages_v_blocks_image_gallery_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_images_parent_id_idx\` ON \`_pages_v_blocks_image_gallery_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_images_image_idx\` ON \`_pages_v_blocks_image_gallery_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_image_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`aspect_ratio\` text DEFAULT 'square',
  	\`enable_lightbox\` integer DEFAULT true,
  	\`gap\` text DEFAULT 'normal',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_order_idx\` ON \`_pages_v_blocks_image_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_parent_id_idx\` ON \`_pages_v_blocks_image_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_path_idx\` ON \`_pages_v_blocks_image_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_cta_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`link\` text,
  	\`style\` text DEFAULT 'primary',
  	\`open_in_new_tab\` integer DEFAULT false,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_cta\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_buttons_order_idx\` ON \`_pages_v_blocks_cta_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_buttons_parent_id_idx\` ON \`_pages_v_blocks_cta_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`description\` text,
  	\`layout\` text DEFAULT 'centered',
  	\`background_image_id\` integer,
  	\`background_color\` text DEFAULT 'gray-50',
  	\`overlay_opacity\` numeric DEFAULT 60,
  	\`padding\` text DEFAULT 'large',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_order_idx\` ON \`_pages_v_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_parent_id_idx\` ON \`_pages_v_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_path_idx\` ON \`_pages_v_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_background_image_idx\` ON \`_pages_v_blocks_cta\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_video\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`video_type\` text DEFAULT 'youtube',
  	\`video_id\` text,
  	\`video_url\` text,
  	\`poster_image_id\` integer,
  	\`aspect_ratio\` text DEFAULT '16:9',
  	\`caption\` text,
  	\`autoplay\` integer DEFAULT false,
  	\`loop\` integer DEFAULT false,
  	\`controls\` integer DEFAULT true,
  	\`width\` text DEFAULT 'normal',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`poster_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_video_order_idx\` ON \`_pages_v_blocks_video\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_video_parent_id_idx\` ON \`_pages_v_blocks_video\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_video_path_idx\` ON \`_pages_v_blocks_video\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_video_poster_image_idx\` ON \`_pages_v_blocks_video\` (\`poster_image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_testimonials_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`quote\` text,
  	\`customer_name\` text,
  	\`customer_title\` text,
  	\`customer_image_id\` integer,
  	\`rating\` numeric,
  	\`_uuid\` text,
  	FOREIGN KEY (\`customer_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_testimonials\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_testimonials_testimonials_order_idx\` ON \`_pages_v_blocks_testimonials_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_testimonials_testimonials_parent_id_idx\` ON \`_pages_v_blocks_testimonials_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_testimonials_testimonials_customer_image_idx\` ON \`_pages_v_blocks_testimonials_testimonials\` (\`customer_image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_testimonials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`show_images\` integer DEFAULT true,
  	\`show_ratings\` integer DEFAULT true,
  	\`background_color\` text DEFAULT 'white',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_testimonials_order_idx\` ON \`_pages_v_blocks_testimonials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_testimonials_parent_id_idx\` ON \`_pages_v_blocks_testimonials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_testimonials_path_idx\` ON \`_pages_v_blocks_testimonials\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_status\` text DEFAULT 'draft',
  	\`version_published_at\` text,
  	\`version_seo_title\` text,
  	\`version_seo_description\` text,
  	\`version_seo_keywords\` text,
  	\`version_seo_image_id\` integer,
  	\`version_seo_no_index\` integer DEFAULT false,
  	\`version_seo_canonical\` text,
  	\`version_custom_c_s_s\` text,
  	\`version_custom_j_s\` text,
  	\`version_layout\` text DEFAULT 'default',
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_seo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_status_idx\` ON \`_pages_v\` (\`version_status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_seo_version_seo_image_idx\` ON \`_pages_v\` (\`version_seo_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_autosave_idx\` ON \`_pages_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`products_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`products_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_order_idx\` ON \`_pages_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_parent_idx\` ON \`_pages_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_path_idx\` ON \`_pages_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_products_id_idx\` ON \`_pages_v_rels\` (\`products_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`products_id\` integer REFERENCES products(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`product_variants_id\` integer REFERENCES product_variants(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`product_options_id\` integer REFERENCES product_options(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`pages_id\` integer REFERENCES pages(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_product_variants_id_idx\` ON \`payload_locked_documents_rels\` (\`product_variants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_product_options_id_idx\` ON \`payload_locked_documents_rels\` (\`product_options_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`products\`;`)
  await db.run(sql`DROP TABLE \`product_variants\`;`)
  await db.run(sql`DROP TABLE \`product_options_values\`;`)
  await db.run(sql`DROP TABLE \`product_options\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_featured_products\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_text\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_image_gallery_images\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_image_gallery\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_cta_buttons\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_video\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_testimonials_testimonials\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_testimonials\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages_rels\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_featured_products\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_text\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_image_gallery_images\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_image_gallery\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_cta_buttons\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_video\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_testimonials_testimonials\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_testimonials\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
}
